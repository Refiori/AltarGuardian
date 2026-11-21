// Orthographic low-poly renderer. World coordinates are x, height, z.
(() => {
    const canvas = document.getElementById('fortress-view');
    const ctx = canvas.getContext('2d');
    const dock = document.querySelector('.dock');
    if (!ctx) return;
    const tau = Math.PI * 2;
    const faces = [];
    let scale, width, height, time, night, originY;
    let seed = 19;
    let warmth=0, actorAlpha=1;
    let skyAngle=Math.PI*.43, skyGoal=skyAngle, lastSkyTime, wasNight=false;
    function blend(a,b,t) {
        const channel=k=>Math.round(((a>>k)&255)*(1-t)+((b>>k)&255)*t);
        return (channel(16)<<16)|(channel(8)<<8)|channel(0);
    }
    function hex(color) { return '#'+color.toString(16).padStart(6,'0'); }
    function random() {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
    }
    const stars = Array.from({length: 82}, () => [random(), random() * .7, random() + .4]);
    const noise = Array.from({length: 64}, () => random());
    // Each ellipse fits a continuous walkable surface. Narrow loops turn sentries at the towers.
    const patrols = [
        {x:0, z:0, y:.02, rx:3.48, rz:2.91, speed:.24},
        {x:4.43, z:0, y:2.2, rx:.19, rz:2.48, speed:.34},
        {x:0, z:6.15, y:.20, rx:3.9, rz:.64, speed:.25},
        {x:0, z:-3.45, y:2.4, rx:3.36, rz:.17, speed:.29},
        {x:-4.43, z:0, y:2.2, rx:.19, rz:2.48, speed:.31}
    ];
    let modelPose;
    function project([x,y,z]) {
        return [width * .5 + (.82*x - .57*z)*scale, originY + (.24*x + .35*z - .91*y)*scale];
    }
    function face(vertices, color, light = 1, glow = false) {
        if (modelPose) {
            const {x,y,z,cos,sin} = modelPose;
            vertices = vertices.map(([u,v,w]) => [x+u*cos+w*sin, y+v, z-u*sin+w*cos]);
        }
        const depth = vertices.reduce((d,[x,y,z]) => d + .52*x + .42*y + .75*z, 0) / vertices.length;
        // Software surface shader: directional sunlight, cool ambient fill and night shading.
        if (!glow && vertices.length >= 3) {
            const a=vertices[0], b=vertices[1], c=vertices[2];
            const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2];
            const vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
            let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
            const length=Math.hypot(nx,ny,nz)||1;
            nx/=length; ny/=length; nz/=length;
            // Surfaces are not consistently wound, so shade both sides identically.
            const sun=Math.abs(nx*-.35+ny*.83+nz*-.43);
            light *= .84 + .23*sun;
        }
        const tint = glow ? 1 : 1 - night * .43;
        const rgb = [16,8,0].map((shift,i) => Math.min(255, Math.round(((color >> shift)&255)*light*tint + night*(glow ? 0 : [1,3,13][i]))));
        if (!glow) {
            rgb[0]=Math.min(255,Math.round(rgb[0]*(1+.16*warmth)));
            rgb[2]=Math.round(rgb[2]*(1-.18*warmth));
        }
        faces.push({vertices, depth, alpha:actorAlpha, fill:'rgb(' + rgb.join(',') + ')'});
    }
    function ring(x,y,z,r,n,aspect=1,angle=0) {
        return Array.from({length:n}, (_,i) => [x + Math.cos(i*tau/n+angle)*r,y,z+Math.sin(i*tau/n+angle)*r*aspect]);
    }
    function solid(base, top, color, glowing=false) {
        for(let i=0;i<base.length;i++) {
            const j=(i+1)%base.length;
            const dx=base[j][0]-base[i][0], dz=base[j][2]-base[i][2];
            if (.57*dz-.82*dx < 0 && top[i][1] === base[i][1]) continue;
            face([base[i],base[j],top[j],top[i]],color,.79+(dz*.1+dx*.18)/(Math.hypot(dx,dz)||1),glowing);
        }
        face(top,color,1.09,glowing);
    }
    function column(x,y,z,r,h,topR,color,n=8,aspect=1,glow=false) {
        solid(ring(x,y,z,r,n,aspect),ring(x,y+h,z,topR,n,aspect),color,glow);
    }
    function box(x,y,z,w,h,d,c) {
        const base=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];
        solid(base,base.map(([a,b,c])=>[a,b+h,c]),c);
    }
    function pine(x,y,z,r) {
        column(x,y,z,.19,1,.16,0x64463f,5);
        for(let i=0;i<3;i++) column(x,y+.5+i*r*.7,z,r*(1-i*.22),r*1.65,.02,i%2?0x39746b:0x285954,6);
    }
    function tower(x,z) {
        column(x,0,z,1.65,.55,1.45,0x5e657c);
        column(x,.55,z,1.4,3,1.23,0x9996a6);
        column(x,1.04,z,1.43,.13,1.42,0x73798f);
        column(x,3.28,z,1.39,.16,1.50,0xc3b7af);
        column(x,3.55,z,1.57,.5,1.54,0xbab1b1);
        column(x,4.05,z,1.48,2,.05,0x425273);
        box(x,5.9,z,.08,1.25,.08,0xeac58a);
        face([[x,7.15,z],[x+1.38,6.84,z+.12*Math.sin(time*2)],[x,6.5,z]],0xc65651);
        box(x,1.9,z+1.28,.48,.92,.11,0x4c4b61);
        box(x,2,z+1.35,.24,.67,.06,0xffbc65);
        face([[x+1.34,3.19,z-.34],[x+1.34,3.19,z+.34],[x+1.43,1.88,z+.28],[x+1.44,1.64,z],[x+1.43,1.88,z-.28]],0xaa5258);
        face([[x+1.45,2.83,z],[x+1.45,2.58,z+.14],[x+1.45,2.32,z],[x+1.45,2.58,z-.14]],0xf3ca78);
    }
    function patrolPosition(index) {
        const route = patrols[index % patrols.length];
        const phase = time*route.speed + Math.floor(index/patrols.length)*2.4 + index%patrols.length;
        const dx = -route.rx*Math.sin(phase), dz = route.rz*Math.cos(phase);
        const speed = Math.hypot(dx,dz);
        return {x:route.x+route.rx*Math.cos(phase), z:route.z+route.rz*Math.sin(phase),
            y:route.y, sin:dx/speed, cos:dz/speed, speed, archer:route.y>1};
    }
    // Two crossed ribbons keep slender equipment visible from either direction.
    function rod(a,b,width,color) {
        for (const axis of [0,2]) {
            const l=a.slice(), r=a.slice(), tip=b.slice(), end=b.slice();
            l[axis]-=width; r[axis]+=width; tip[axis]+=width; end[axis]-=width;
            face([l,r,tip,end],color);
        }
    }
    function bow(draw,bob) {
        const grip=[-.21,.97+bob,.53];
        const nock=[-.21,.99+bob,.26-.41*draw];
        for (const sign of [-1,1]) {
            const elbow=[-.21,grip[1]+sign*.44,.45];
            const tip=[-.21,grip[1]+sign*.69,.24];
            rod(grip,elbow,.043,0xc99863);
            rod(elbow,tip,.030,0xb18159);
            rod(tip,nock,.011,0xf5dfb1);
        }
        rod([-.30,1.03+bob,0],grip,.072,0x79976c);
        rod([.27,1.04+bob,0],nock,.069,0x79976c);
        rod(nock,[-.21,1+bob,.78-.41*draw],.019,0xbca57b);
        column(.23,.57+bob,-.24,.14,.58,.14,0x795238,6);
        for (let i=0;i<3;i++) box(.15+i*.063,1.11+bob,-.24,.035,.23+i*.045,.04,0xe7d7b3);
    }
    function guard(index, attackers, post) {
        const {speed,archer} = post;
        const stride = reduceMotion ? 0 : Math.sin(time*5.4+index*2)*Math.min(1,speed*.65);
        modelPose = {...post};
        const target = attackers[index % (attackers.length || 1)];
        let strike = 0, draw = 0;
        if (target) {
            const dx = target.x-modelPose.x, dz = target.z-modelPose.z;
            const distance = Math.hypot(dx,dz) || 1;
            modelPose.sin = dx/distance;
            modelPose.cos = dz/distance;
            const cycle = (target.age/900 + index*.37) % 1;
            strike = Math.max(0,Math.sin(cycle*tau));
            draw = cycle < .28 ? cycle/.28 : 0;
            if (!archer && distance < 2.8 && target.y < 1) {
                modelPose.x += modelPose.sin*strike*.48;
                modelPose.z += modelPose.cos*strike*.48;
            } else if (archer && cycle > .28 && cycle < .75) {
                const t = (cycle-.28)/.47;
                const h = target.y+.85-modelPose.y;
                const arc = t*(1-t)*3;
                const head = [-.21*(1-t),1+(h-1)*t+arc,.53+(distance-.53)*t];
                face([head,[head[0]-.045,head[1]+.05,head[2]-.67],[head[0]+.045,head[1]-.03,head[2]-.67]],0xf1c593);
            }
        }
        const bob = .045*Math.abs(stride);
        for (const side of [-1,1]) {
            const step = side*stride;
            box(side*.135,.10+.08*Math.max(0,step),step*.17,.17,.48,.19,0x475366);
            box(side*.135,.025+.08*Math.max(0,step),step*.21+.045,.20,.17,.30,0x4d392f);
        }
        column(0,.51+bob,0,.32,.51,.34,0x365878,6,.78);
        column(0,.73+bob,0,.34,.09,.34,0xaf864d,6,.81);
        column(0,.90+bob,0,.36,.28,.27,archer?0x637f55:0x91a5b6,6,.8);
        box(0,.79+bob,.246,.15,.26,.035,0xc46954);
        column(0,1.17+bob,0,.225,.24,.215,0xe1b487,7);
        if (archer) {
            column(0,1.36+bob,0,.29,.30,.055,0x526e45,7);
            bow(draw,bob);
            modelPose=null;
            return;
        }
        column(0,1.35+bob,0,.28,.25,.10,0xb7cad0,8);
        box(0,1.26+bob,.212,.065,.19,.065,0x8297a5);
        face([[-.05,1.57+bob,0],[0,1.78+bob,-.04],[0,1.62+bob,-.35],[.06,1.55+bob,-.12]],0xb95952);
        const arm = .07*stride;
        column(.34,.92+bob,arm,.14,.17,.11,0xa6b6bd,5);
        if (target) {
            const reach = .83+strike*.75;
            face([[.34,.83,-.32],[.41,.86,-.32],[.39,1.13,reach],[.34,1.11,reach]],0xbc945e);
            face([[.29,1.10,reach],[.46,1.12,reach],[.37,1.18,reach+.38]],0xe6e9db);
        } else {
            box(.37,.18+bob,arm,.055,1.55,.055,0x9e7b56);
            column(.37,1.73+bob,arm,.09,.27,.005,0xdae3df,4);
        }
        const shield = [[-.51,1.11,.19],[-.16,1.11,.25],[-.17,.78,.26],[-.33,.58,.24],[-.50,.77,.19]];
        face(shield.map(([x,y,z])=>[x,y+bob,z-arm]),0xc9a46c);
        face(shield.map(([x,y,z])=>[-.34+(x+.34)*.79,.88+(y-.88)*.77+bob,z-arm+.015]),0x385e77);
        modelPose = null;
    }
    function cottage(w,d,floors,index,use) {
        const h=.85*floors, roof=[0x99574a,0x776975,0xb07454,0x776e62][index%4];
        box(0,-.11,0,w*2,h+.11,d*2,use==='smith'?0x998f83:use==='stable'?0xa78460:0xd8c7a7);
        const ridge=h+.59*w/.7;
        for(const side of [-1,1]) {
            const edge=side*(w+.15);
            face([[edge,h,-d-.12],[edge,h,d+.12],[0,ridge,d+.12],[0,ridge,-d-.12]],roof,1+side*.12);
            face([[-w,h,side*d],[w,h,side*d],[0,ridge,side*d]],0xc9b594);
        }
        // Break up the roof planes with overlapping courses and a capped flue.
        for(const side of [-1,1]) for(const t of [.32,.68]) {
            const rx=side*(w+.15)*t, ry=ridge+(h-ridge)*t+.014;
            face([[rx,ry,-d-.12],[rx,ry,d+.12],[rx+.031*side,ry-.012,d+.12],
                [rx+.031*side,ry-.012,-d-.12]],blend(roof,0xe8cfac,.18));
        }
        if(index%3!==1 && !use) {
            box(-w*.45,h+.15,-d*.40,.22,.64,.24,0x937969);
            box(-w*.45,h+.75,-d*.40,.28,.10,.30,0x705d57);
        }
        const timber=0x795f4c;
        for(const sx of [-1,1]) for(const sz of [-1,1])
            box(sx*(w-.026),.02,sz*(d-.026),.088,h,.088,timber);
        for(const sz of [-1,1]) {
            const fz=sz*(d+.013);
            face([[-w,h,fz],[w,h,fz],[w,h-.062,fz],[-w,h-.062,fz]],timber);
            face([[-.035,h,fz],[.035,h,fz],[.035,ridge-.035,fz],[-.035,ridge-.035,fz]],timber);
        }
        box(0,0,d+.012,use==='stable'?w*1.35:.29,.62,.035,0x655044);
        if(floors===2) box(0,.79,0,2*w+.04,.11,2*d+.04,0x806753);
        for(let level=0;level<floors;level++) {
            for(const side of [-1,1]) {
                for(const z of [-d*.48,d*.48]) {
                    const wy=level*.85+.30, wx=side*(w+.025);
                    face([[wx,wy,z-.18],[wx,wy+.31,z-.18],[wx,wy+.31,z+.18],[wx,wy,z+.18]],0x675648);
                    face([[wx+side*.012,wy+.04,z-.087],[wx+side*.012,wy+.27,z-.087],
                        [wx+side*.012,wy+.27,z+.087],[wx+side*.012,wy+.04,z+.087]],
                        blend(0xa6b6ab,0xffc167,night),1,true);
                }
                for(const sz of [-1,1]) {
                    const fz=sz*(d+.02), xc=side*w*.6, wy=level*.85+.33;
                    face([[xc-.09,wy,fz],[xc+.09,wy,fz],[xc+.09,wy+.22,fz],[xc-.09,wy+.22,fz]],
                        blend(0x858c80,0xffcc78,night),1,true);
                }
            }
        }
    }
    function smithy(w) {
        // Open furnace and chimney beside the workshop.
        box(w+.53,0,.20,.92,.81,.83,0x7d7872);
        box(w+.53,.13,.63,.62,.50,.04,0x463936);
        column(w+.53,.14,.67,.22,.34+.08*Math.sin(time*5),.04,0xffac43,6,1,true);
        box(w+.54,.80,.13,.45,1.52,.49,0x896f63);
        box(w+.54,2.24,.13,.54,.13,.57,0x625657);
        for(let i=0;i<4;i++) {
            const t=(time*.31+i/4)%1;
            actorAlpha=.45*(1-t);
            column(w+.54+.44*t,2.40+t*1.25,.13,.12+.24*t,.19,.11+.20*t,0xb4aba3,6);
        }
        actorAlpha=1;
        box(w+.13,0,1.48,.37,.31,.37,0x76513e);
        box(w+.13,.31,1.48,.66,.16,.27,0x58616b);
        face([[w+.45,.47,1.35],[w+.45,.47,1.61],[w+.75,.46,1.48]],0x8a9098);
    }
    function paddock(w,d) {
        const left=-w-2.55,right=-w-.10;
        for(const x of [left,right]) {
            for(const z of [-d,0,d]) box(x,0,z,.10,.79,.10,0x735a40);
            for(const y of [.27,.57]) box(x,y,0,.07,.085,2*d,0xb29568);
        }
        for(const z of [-d,d]) for(const y of [.27,.57])
            box((left+right)/2,y,z,right-left,.085,.07,0xb29568);
        for(const [x,z,coat] of [[left+.71,-.45,0x896049],[right-.62,.42,0xab8768]]) {
            box(x,.38,z,.30,.35,.72,coat);
            for(const side of [-1,1]) for(const end of [-1,1])
                box(x+.10*side,0,z+.24*end,.07,.44,.08,0x59483c);
            box(x,.61,z+.29,.18,.34,.21,coat);
            box(x,.86,z+.40,.19,.17,.35,coat);
            box(x,.55,z-.39,.12,.24,.11,0x59483c);
        }
    }
    function valley([x,y,z]) {
        // Orient the valley across the view. u follows the river; v crosses it.
        function point(u,v,h) {
            const bend=2.7*Math.sin(u*.14)+1.15*Math.sin(u*.29);
            const cross=v+bend;
            return [x+.82*u+.57*cross,y+h,z-.57*u+.82*cross];
        }
        const first=faces.length;
        const extent=Math.ceil(width/scale)+18;
        const stripes=[
            [-19,2.5,0x718a78],[-14,2.0,0x78937a],[-10,1.05,0x84987c],[-7,.84,0x859975],[-5,.68,0x899b72],
            [-2.4,.22,0xb5ad81],[-1.8,.04,0x92b7a5],[-1.35,0,0x6caaad],
            [-.6,0,0x508e9e],[.75,0,0x67a6ab],[1.5,.02,0x98b8a8],
            [2.0,.12,0xc1b491],[2.7,.33,0x96a278],[6,.65,0x80976f],[10,1.05,0x7c9472],[15,2.1,0x718a70],[22,2.8,0x6f8671],[40,3.2,0x758b78],[80,3.4,0x809181]
        ];
        function terrain(u,[v,h]) {
            const bank=Math.min(1,Math.abs(v)/7);
            const spread=1+.13*Math.sin(.23*u+v*.24)+.09*Math.sin(.46*u+v*.38);
            const hills=bank*bank*(.55*Math.sin(u*.31+v)+.45*Math.sin(u*.16-v*.31)+.22*Math.cos(u*.53+v*.42));
            return point(u,v*spread,h+hills);
        }
        // Sample the same bank profile for paths, foundations and riverbank props.
        function ground(u,v) {
            const j=stripes.findIndex(strip=>strip[0]>=v);
            if(j<=0) return terrain(u,[v,stripes[j===0?0:stripes.length-1][1]]);
            const [v0,h0]=stripes[j-1],[v1,h1]=stripes[j];
            return terrain(u,[v,h0+(h1-h0)*(v-v0)/(v1-v0)]);
        }
        for(let u=-extent;u<extent;u+=2) {
            for(let j=1;j<stripes.length;j++) {
                const a=stripes[j-1],b=stripes[j];
                const steps=Math.max(1,Math.ceil((b[0]-a[0])/3));
                for(let k=0;k<steps;k++) {
                    const sample=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
                    const lo=sample(k/steps), hi=sample((k+1)/steps);
                    const p0=terrain(u,lo), p1=terrain(u+2,lo), p2=terrain(u+2,hi), p3=terrain(u,hi);
                    const color=blend(a[2],b[2],(k+.5)/steps);
                    face([p0,p1,p2,p3],color,1);
                }
            }
        }
        for(let i=first;i<faces.length;i++) faces[i].depth-=40;
        for (let i=0;i<64;i++) {
            const u=(i*1.9+time*.65)%100-50;
            const v=(noise[i]-.5)*2.4;
            face([point(u,v,.04),point(u+.77,v+.04,.04),point(u+.25,v+.10,.04)],0xa7d1ca);
        }
        for (let i=0;i<115;i++) {
            const u=(i%48-24)*1.3+noise[i%64];
            const v=(i%2?1:-1)*(3.1+noise[(i*7)%64]*10);
            const [tx,ty,tz]=terrain(u,[v,.69]);
            face(ring(tx,ty+.04,tz,.17+noise[i%64]*.36,5,.42),i%4===0?0xaab399:0x768f71);
        }
        // Keep grass polygons behind the streets and buildings on the valley floor.
        for(let i=first;i<faces.length;i++) faces[i].depth-=80;
        function street(u,bank,offset=0) {
            const bend=.72*Math.sin(u*.60)+.48*Math.cos(u*.28);
            return ground(u,bank*(5.9+bend)+offset);
        }
        // Individual plots leave courtyards, forks and gaps along both banks.
        // [along river, bank, setback from lane, yaw, half-width, half-length, floors, use]
        const plots=[
            [-4.8,1,2.0,-.44,.63,.76,1],[-2.2,1,-1.45,.86,.64,.99,2],
            [2.5,1,2.55,-.78,.76,1.30,1,'stable'],[5.1,1,-1.63,.48,.60,.86,1],
            [8.0,1,2.1,.14,.78,.93,2],[9.8,1,-1.55,-.64,.61,.70,1],
            [15.05,1,3.35,.88,.65,1.25,1],[17.1,1,-1.4,-.26,.76,1.12,2],
            [19.1,1,2.4,-.95,.67,.86,1],[22.8,1,-1.55,.38,.68,1.33,1],
            [-5.4,-1,-1.65,.70,.74,.82,2],[-2.8,-1,1.3,-.38,.59,.87,1],
            [4.9,-1,-1.5,.25,.66,1.19,1],[9.4,-1,1.65,-.56,.69,.81,2],
            [14.3,-1,-2.3,.91,.74,.89,1],[17.7,-1,1.42,-.35,.77,1.04,1,'smith'],
            [21.3,-1,-1.96,.36,.65,1.22,2],[24.6,-1,1.44,-.63,.59,.84,1]
        ];
        for(const bank of [-1,1]) for(let u=-6;u<25;u+=.5) {
            face([street(u,bank,-.19),street(u+.5,bank,-.19),
                street(u+.5,bank,.19),street(u,bank,.19)],0xc7b88c);
        }
        // Cross the river diagonally so the masonry arch is visible from the island.
        const start=street(6,-1), end=street(13.6,1);
        const runX=end[0]-start[0], runZ=end[2]-start[2], span=Math.hypot(runX,runZ);
        function bridgePoint(t,side,elevation) {
            return [start[0]+t*runX-side*runZ/span,elevation,start[2]+t*runZ+side*runX/span];
        }
        function deckHeight(t) {
            return start[1]*(1-t)+end[1]*t+1.64*Math.sin(Math.PI*t);
        }
        function vaultHeight(t) {
            const radius=(t-.5)/.40;
            return y-.32+1.84*Math.sqrt(Math.max(0,1-radius*radius));
        }
        for(let i=0;i<20;i++) {
            const a=i/20,b=(i+1)/20, lowA=vaultHeight(a),lowB=vaultHeight(b);
            const topA=deckHeight(a),topB=deckHeight(b);
            face([bridgePoint(a,-.55,topA),bridgePoint(b,-.55,topB),
                bridgePoint(b,.55,topB),bridgePoint(a,.55,topA)],0xc4b298);
            face([bridgePoint(a,-.55,lowA),bridgePoint(b,-.55,lowB),
                bridgePoint(b,.55,lowB),bridgePoint(a,.55,lowA)],0x696a68);
            for(const edge of [-.55,.55]) {
                const stone=[0xa69b8b,0xb5aa98,0x998f81][i%3];
                face([bridgePoint(a,edge,lowA),bridgePoint(b,edge,lowB),
                    bridgePoint(b,edge,topB+.20),bridgePoint(a,edge,topA+.20)],stone);
                const outside=edge*1.025;
                face([bridgePoint(a,outside,lowA),bridgePoint(b,outside,lowB),
                    bridgePoint(b,outside,lowB+.19),bridgePoint(a,outside,lowA+.19)],blend(stone,0xf3debc,.36));
                face([bridgePoint(a,edge,topA+.20),bridgePoint(b,edge,topB+.20),
                    bridgePoint(b,edge*.77,topB+.20),bridgePoint(a,edge*.77,topA+.20)],0xd0c2ab);
            }
        }
        for (const t of [.045,.955]) for (const side of [-.55,.55]) {
            const [lx,ly,lz]=bridgePoint(t,side,deckHeight(t));
            box(lx,ly,lz,.23,.44,.23,0xa69887);
            box(lx,ly+.42,lz,.30,.09,.30,0xd1c5ac);
            column(lx,ly+.50,lz,.044,.46,.044,0x535457,5);
            column(lx,ly+.96,lz,.13,.21,.15,blend(0xc1b39a,0xffb854,night),6,1,true);
            column(lx,ly+1.17,lz,.18,.12,.035,0x555e65,6);
        }
        for(const [i,[u,bank,lane,yaw,w,d,floors,use]] of plots.entries()) {
            const [hx,hy,hz]=street(u,bank,lane);
            const lanePoint=street(u-.36,bank);
            let sin=Math.sin(yaw),cos=Math.cos(yaw);
            const front=(lanePoint[0]-hx)*sin+(lanePoint[2]-hz)*cos;
            if(front<0 && !use) {sin=-sin;cos=-cos;}
            const entrance=front<0 && use ? -1 : 1;
            const door=[hx+entrance*sin*(d+.10),hy+.014,hz+entrance*cos*(d+.10)];
            const pathX=door[0]-lanePoint[0],pathZ=door[2]-lanePoint[2];
            const len=Math.hypot(pathX,pathZ)||1;
            const pathEdge=(v,side)=>[v[0]-side*.14*pathZ/len,v[1]+.013,v[2]+side*.14*pathX/len];
            face([pathEdge(lanePoint,-1),pathEdge(lanePoint,1),pathEdge(door,1),pathEdge(door,-1)],0xc4b48e);
            // Soft contact shadows anchor the house to its plot.
            face(ring(hx+.18,hy+.005,hz+.12,Math.max(w,d)*1.28,9,.78),0x6d795d);
            faces[faces.length-1].depth-=35;
            modelPose={x:hx,y:hy,z:hz,cos,sin};
            cottage(w,d,floors,i,use);
            if(entrance<0) box(0,0,-d-.02,.34,.62,.04,0x655044);
            if(use==='smith') smithy(w);
            if(use==='stable') paddock(w,d);
            modelPose=null;
        }
        for(const [u,bank,lane,yaw] of [[11.2,1,3.0,.72],[20.8,1,2.6,-.38],[-.8,-1,-2.25,.34]]) {
            const [gx,gy,gz]=street(u,bank,lane);
            modelPose={x:gx,y:gy,z:gz,cos:Math.cos(yaw),sin:Math.sin(yaw)};
            for(let row=0;row<4;row++) {
                const px=(row-1.5)*.32;
                box(px,0,0,.25,.09,1.72,0x73533a);
                for(let j=0;j<6;j++)
                    column(px,.09,(j-2.5)*.25,.105,.13+.07*noise[j+row],.055,row%2?0x789747:0xaab859,5);
            }
            modelPose=null;
        }
        // A fishing landing on the near bank, upstream of the town bridge.
        const quay=ground(4.3,2.6);
        modelPose={x:quay[0],y:y+.34,z:quay[2],cos:.82,sin:.572};
        for(const px of [-.46,.46]) for(const pz of [-1.95,-.13])
            column(px,-.59,pz,.095,.83,.083,0x68533d,5);
        for(let j=0;j<9;j++) box(0,-.06,-j*.245,1.03,.11,.235,j%3?0x9c7d59:0xb49769);
        column(.28,.06,-.48,.22,.42,.20,0x846543,8);
        column(.28,.32,-.48,.22,.045,.22,0x565950,8);
        const bob=reduceMotion?0:.035*Math.sin(time*1.8);
        const hull=ring(-1.13,-.24+bob,-1.73,.40,8,2.42);
        solid(ring(-1.13,-.47+bob,-1.73,.19,8,3.5),hull,0x75523c);
        face(ring(-1.13,-.22+bob,-1.73,.31,8,2.62),0x453a31);
        for(const dz of [-.28,.24]) box(-1.13,-.19+bob,-1.73+dz,.63,.055,.13,0xb49165);
        rod([-.50,.18,-1.95],[-.94,-.20+bob,-2.19],.019,0xc5aa81);
        modelPose=null;
        // Reed clumps and worn stones punctuate the shallow water along each shore.
        for(let i=0;i<33;i++) {
            const u=-9+i*1.12,bank=i%2?1:-1;
            if(Math.abs(u)<1.9 || Math.abs(u-4.3)<1.7) continue;
            const [rx,ry,rz]=ground(u,bank*(1.70+.36*noise[i]));
            for(let j=0;j<4;j++) {
                const dx=(noise[i+j]-.5)*.46, dz=(noise[i+13+j]-.5)*.32;
                face([[rx+dx-.038,ry,rz+dz],[rx+dx+.035,ry,rz+dz],
                    [rx+dx+.08+dx*.45,ry+.22+noise[i+j]*.28,rz+dz-.04]],j%2?0x738457:0xa0a56a);
            }
            if(i%3===0) column(rx+.21,ry-.035,rz,.25,.15,.16,0x93948b,6,.73);
        }
        for(let i=0;i<18;i++) {
            const u=9.5+14*Math.sin(time*(.046+.012*noise[i])+i*2.4);
            const crossing=(1+Math.sin(time*.105+i*1.7))/2;
            const [px,py,pz]=i<2
                ? bridgePoint(crossing,(i-.5)*.35,deckHeight(crossing))
                : street(u,i%2?1:-1,(noise[i]-.5)*.30);
            const gait=reduceMotion?0:.055*Math.sin(time*5+i);
            for(const side of [-1,1]) box(px+side*.08,py+.02,pz+side*gait,.08,.20,.10,0x574e48);
            column(px,py+.18,pz,.15,.28,.10,[0x975e55,0x698096,0xb59c62][i%3],5);
            column(px,py+.46,pz,.09,.14,.08,0xe3ba94,6);
        }
        // A few stands of trees establish the scale of the land below the island.
        for (let i=0;i<30;i++) {
            const u=(i-15)*2.7;
            const v=(i%2?1:-1)*(4.6+noise[i]*5);
            if(u>-7 && u<26 && Math.abs(v)<10) continue;
            const [tx,ty,tz]=terrain(u,[v,.55]);
            pine(tx,ty,tz,.48+noise[i+20]*.47);
        }
        for(let i=first;i<faces.length;i++) faces[i].depth-=500;
    }
    function waterfall(left,right) {
        const x=(left[0]+right[0])/2, z=(left[2]+right[2])/2, lipY=left[1];
        const dx=(right[0]-left[0])/2, dz=(right[2]-left[2])/2;
        const halfWidth=Math.hypot(dx,dz);
        const nx=-dz/halfWidth, nz=dx/halfWidth;
        const throwDistance=1.16*(1-Math.exp(-4));
        const impact=[x+nx*throwDistance,lipY-7.35,z+nz*throwDistance];
        valley(impact);
        const segments=128, step=tau/segments;
        const mouth=Math.round((Math.atan2(z/8.1,x/9.8)+.07)/step);
        const halfMouth=3;
        function mixWaterColor(from,to,t) {
            const channel=shift=>Math.round(((from>>shift)&255)*(1-t)+((to>>shift)&255)*t);
            return (channel(16)<<16)|(channel(8)<<8)|channel(0);
        }
        function wave(a,d) {
            return Math.sin(24*a-2.1*time+d*2)+.48*Math.sin(39*a+3*d-3*time);
        }
        function bank(a,d) {
            const bend=.53*Math.sin(3*a+.4)+.34*Math.sin(5*a)+.17*Math.sin(7*a-.7);
            const wet=Math.max(0,1-Math.abs(d));
            return [(9.8+bend+d)*Math.cos(a),-.07+wet*.065*wave(a,d),(8.1+bend+d)*Math.sin(a)];
        }
        const layers=[-.95,-.73,-.42,-.12,.22,.53,.80,.96];
        const palette=[0xa49c76,0x84bcaf,0x66a9a6,0x438c99,0x549ba4,0x79b4ae,0xabac85];
        const waterStart=faces.length;
        for(let i=0;i<segments;i++) {
            const a=i*step,b=(i+1)*step;
            for(let j=1;j<layers.length;j++) {
                const d=layers[j-1],e=layers[j];
                const light=1+.055*wave(a,(d+e)*.5);
                // The outer bank opens into the outflow. Fade from the deep channel
                // to shallows only along the two shores of the fork.
                const side=Math.abs((i+.5-mouth)/halfMouth);
                const opening=Math.max(0,Math.min(1,(1-side)*3))*Math.max(0,Math.min(1,(e+.12)/.65));
                face([bank(a,d),bank(b,d),bank(b,e),bank(a,e)],
                    mixWaterColor(palette[j-1],0x539ca5,opening),light);
            }
            // A crescent of dry sand widens into a beach on the sunlit bank.
            const sandWidth=Math.pow(Math.max(0,Math.cos(a-.72)),12)*.85;
            const nextWidth=Math.pow(Math.max(0,Math.cos(b-.72)),12)*.85;
            if(sandWidth+nextWidth>.015)
                face([bank(a,.96),bank(b,.96),bank(b,.96+nextWidth),bank(a,.96+sandWidth)],0xe1c999);
        }
        for(let i=0;i<22;i++) {
            const a=.45+noise[i]*.54;
            const [px,py,pz]=bank(a,1.04+noise[i+23]*.34);
            face(ring(px,py+.035,pz,.034+noise[i+11]*.061,5,.63),i%3===0?0xb3a184:0xf1d8aa);
        }
        for(let i=0;i<70;i++) {
            const a=i*tau/70+time*.11,d=.57*Math.sin(i*2.1);
            face([bank(a,d),bank(a+.024,d+.08),bank(a+.055,d+.09),bank(a+.025,d+.045)],0xb6dbcf);
        }
        // Reuse the river's outer mesh edge, including its intermediate vertices.
        // Side -1 is the upstream (negative-x) shore at this bend.
        const mouthEdge=Array.from({length:2*halfMouth+1},(_,i)=>bank((mouth+halfMouth-i)*step,.96));
        function chute(t,side) {
            const u=(side+1)*halfMouth;
            const i=Math.max(0,Math.min(mouthEdge.length-2,Math.floor(u)));
            const f=u-i;
            const start=mouthEdge[i].map((v,k)=>v+(mouthEdge[i+1][k]-v)*f);
            const endX=x+dx*side, endZ=z+dz*side;
            // Cubic controls pull the head of the stream outward and bring the
            // last section into alignment with the falling sheet.
            const q=1-t, axis=mouth*step;
            const p1x=start[0]+(endX-start[0])*.30+Math.cos(axis)*.18;
            const p1z=start[2]+(endZ-start[2])*.30+Math.sin(axis)*.18;
            const p2x=endX-nx*.52, p2z=endZ-nz*.52;
            return [q*q*q*start[0]+3*q*q*t*p1x+3*q*t*t*p2x+t*t*t*endX,
                start[1]+(lipY-start[1])*t*t+.035*t*q*wave(t,side),
                q*q*q*start[2]+3*q*q*t*p1z+3*q*t*t*p2z+t*t*t*endZ];
        }
        for(let i=0;i<24;i++) {
            const a=i/24,b=(i+1)/24;
            for(let j=0;j<2*halfMouth;j++) {
                const d=j/halfMouth-1,e=(j+1)/halfMouth-1;
                const side=Math.abs((d+e)*.5);
                const opening=Math.min(1,(1-side)*3);
                const startColor=mixWaterColor(palette[palette.length-1],0x539ca5,opening);
                const endColor=side>.8?0x91c7bb:0x78bec4;
                face([chute(a,d),chute(b,d),chute(b,e),chute(a,e)],
                    mixWaterColor(startColor,endColor,b),1+.032*wave(mouth*step+a,d));
            }
        }
        for(let i=0;i<19;i++) {
            const t=(noise[i]+time*.37)%1,d=(noise[i+18]-.5)*1.48;
            const mid=Math.min(1,t+.036),end=Math.min(1,t+.088);
            face([chute(t,d),chute(mid,d+.029),chute(end,d+.014),chute(mid,d-.013)],0xb5dad3);
        }
        for(let i=waterStart;i<faces.length;i++) faces[i].depth=-40+(i-waterStart)*.0001;
        // Curved sections follow the water over the lip and narrow as it accelerates.
        function surface(t, angle) {
            const reach = 1-Math.exp(-4*t);
            const ripple = .045*Math.sin(angle*3 + 19*t - time*4);
            const lateral=(1-.46*t+ripple*reach)*Math.cos(angle);
            const outward=1.16*reach+(.32+ripple)*reach*Math.sin(angle);
            return [x+dx*lateral+nx*outward, lipY-7.35*t*t,z+dz*lateral+nz*outward];
        }
        const sides = 12, levels = 12;
        let upper = Array.from({length:sides},(_,i)=>surface(0,tau*i/sides));

        for (let row=1; row<=levels; row++) {
            const t = row/levels;
            const lower = Array.from({length:sides},(_,i)=>surface(t,tau*i/sides));
            for (let i=0; i<sides; i++) {
                const j=(i+1)%sides;
                const normal=Math.sin(tau*(i+.5)/sides);
                const glint=.055*Math.sin(row*.88-time*4+i*1.56);
                face([upper[i],upper[j],lower[j],lower[i]],normal>.58?0x91dfe5:0x549fb9,.84+.17*normal+glint);
            }
            upper=lower;
        }
        for (let i=0; i<24; i++) {
            const t=(time*.48+noise[i])%1;
            const angle=.35+noise[i+17]*2.22;
            const point=(u,a)=>{
                const [px,py,pz]=surface(u,a);
                return [px,py+.019,pz+.055];
            };
            face([point(t,angle),point(t,angle+.09),point(Math.min(1,t+.062),angle+.045)],
                i%3===0?0xd5f8f8:0xb3e9ef);
        }
        // Short ballistic arcs originate exactly where the channel rolls over the rock.
        for (let i=0; i<30; i++) {
            const t=(time*(.9+.5*noise[i])+noise[i+24])%1;
            const spread=noise[i+12]-.5;
            const across=spread*(1.9+1.5*t), forward=.09+t*(.65+noise[i+22]);
            const px=x+dx*across+nx*forward;
            const py=lipY+.14+(2.6+noise[i]*1.8)*t-5.1*t*t;
            const pz=z+dz*across+nz*forward;
            const r=(.038+.043*noise[i+11])*(1-.45*t);
            face([[px-r,py,pz],[px,py+1.6*r,pz],[px+r,py,pz],[px,py-r,pz]],0xe3f9f7);
        }
        // Ring segments share the landing point with the falling sheet and the riverbed.
        for(let i=0;i<3;i++) {
            const phase=(time*.62+i/3)%1;
            const outer=ring(impact[0],impact[1]+.055,impact[2],.46+phase*.99,28,.75);
            const inner=ring(impact[0],impact[1]+.055,impact[2],.42+phase*1.01,28,.75);
            for(let j=0;j<outer.length;j++) {
                if ((j+i*3)%9===0) continue;
                const k=(j+1)%outer.length;
                face([outer[j],outer[k],inner[k],inner[j]],phase<.54?0xd4e9df:0x90beb9);
                faces[faces.length-1].depth=-180;
            }
        }
        return project(impact);
    }
    function world() {
        // Two irregular cliff bands share their rim, keeping the island watertight.
        const rim=ring(0,-.15,0,14,18,.77).map(([x,y,z],i)=>[x*(.92+noise[i]*.13),y,z*(.92+noise[i]*.13)]);
        // Cut a level sill into the actual cliff edge. The chute and falling sheet share it.
        const rimPoint=(t,drop)=>rim[6].map((v,k)=>v+(rim[5][k]-v)*t-(k===1?drop:0));
        const lipLeft=rimPoint(.18,.29), lipRight=rimPoint(.55,.29);
        rim.splice(6,0,rimPoint(.59,0),lipRight,lipLeft,rimPoint(.14,0));
        const ledge=rim.map(([x,y,z],i)=>[x*.94,-1.4-noise[i+18]*1.6,z*.94]);
        const foot=rim.map(([x,y,z],i)=>[x*.62,-3.7-noise[i+30]*1.7,z*.62]);
        solid(foot,ledge,0x55546b); solid(ledge,rim,0x867e83); face(rim,0x668274,1.13);
        // Ground and cliff faces form the background for everything on the island.
        for (const polygon of faces) polygon.depth -= 100;
        const mist = waterfall(lipLeft,lipRight);
        for (const [x,z,r] of [[0,0,4.5],[-5,-4,2],[5,-4,2],[-5,4,2],[5,4,2],[-9,-2,1.8],[7,-6,1.7]]) {
            face(ring(x+.65,-.12,z+.32,r,10,.65),0x566e60);
            faces[faces.length-1].depth -= 50;
        }
        for (const [x,z,r] of [[-9,-2,1.5],[-8,-4,1.7],[-10,1,1.1],[5,-7,1.45],[7,-6,1.1],[10,-3,1.35],[-7,5,1.1]]) pine(x,-.15,z,r);
        for(let i=0;i<13;i++) {
            const a=i*tau/13;
            column(11*Math.cos(a),-.14,8.4*Math.sin(a),.28+noise[i]*.55,.25+noise[i]*.55,.19,0x9b9596,5);
        }
        for(let i=0;i<42;i++) {
            const a=i*2.4, radius=6.8+noise[i]*4.7;
            const x=radius*Math.cos(a), z=radius*.76*Math.sin(a);
            if(Math.abs(x)<1.7 && z>3) continue;
            face([[x,0,z],[x+.13,.29,z],[x+.18,0,z+.06]],0x9baa79);
            face([[x+.1,0,z],[x+.33,.18,z+.08],[x+.24,0,z+.12]],0xaabc83);
        }
        for(let i=0;i<14;i++) {
            const a=i*tau/14;
            face(ring(3*Math.cos(a),.035,3*Math.sin(a),.1,4),0xf6c97b,1,true);
        }
        const damage=Number(sceneElement.dataset.damage)||0;
        for(let i=-4;i<=4;i++) {
            for(const [x,z,side] of [[i,-4,false],[i,4,false],[-5,i,true],[5,i,true]]) {
                if(z===4 && Math.abs(x)<2) continue;
                const h=(side?2.2:2.4)-(z===4 && damage && i===3 ? damage*.52:0);
                box(x,0,z,side?.62:.99,h,side?.99:.62, i%2?0x9b969f:0xa6a0a6);
                if(i%2===0) box(x,h,z,.58,.43,.58,0xc2b9b7);
            }
        }
        // Inner wall walks sit behind the merlons and stop before the tower roofs.
        for (const side of [-1,1]) box(side*4.47,1.96,0,.92,.24,6.0,0x98959d);
        box(0,2.16,-3.48,7.8,.24,.92,0x99969f);
        for(const x of [-5,5]) for(const z of [-4,4]) tower(x,z);
        for(let i=0;i<10;i++) box(0,.04,4+i*.60,2.4,.16,.57,0xbaa58b);
        for (const side of [-1,1]) {
            box(side*1.08,.68,8.3,.10,.11,2.6,0x856748);
            for(const z of [7.08,8.3,9.52]) box(side*1.08,.10,z,.15,.69,.15,0x785d44);
        }
        for(let i=0;i<3;i++) column(0,i*.47,0,2.7-i*.43,.48,2.65-i*.43, i===2?0xc4a878:0x677483,8);
        const lift=2.6+.15*Math.sin(time*1.65);
        const middle=ring(0,lift+1,0,1.05,6,1,time*.24);
        const tip=[0,lift+3,0], bottom=[0,lift-.87,0];
        for(let i=0;i<6;i++) {
            const j=(i+1)%6;
            const color=sceneElement.classList.contains('is-defeat')?0x666177:[0x79f3dc,0xa3fff1,0x67c8ec,0x8093eb,0x508fbd,0x72e2e8][i];
            face([middle[i],middle[j],tip],color,1,true);
            face([middle[i],middle[j],bottom],color,.72,true);
        }
        const guardCount = (gameData.guards?.length ?? 4) + (gameData.actionCounts.train ?? 0);
        const posts=Array.from({length:guardCount},(_,i)=>patrolPosition(i));
        const attackers = wavePositions(posts.filter(post=>!post.archer));
        for (let i=0; i<guardCount; i++) guard(i, attackers, posts[i]);
        const event=sceneElement.dataset.event;
        if(event?.startsWith('meteor')) {
            column(8,0,2,1.6,.18,1.4,0x554255);
            for(let i=0;i<3;i++) column(7.5+i*.5,.18,2+noise[i]*.5,.35,1+noise[i],.04,event==='meteor'?0xdc93fa:0x85b8be,5,1,true);
        }
        if(event==='caravan') wagon(3,7,.5);
        const elapsed=performance.now()-Number(sceneElement.dataset.supplyStarted);
        if(elapsed>=0 && elapsed<1700) {
            const p=elapsed/1700;
            const smooth=t=>t*t*(3-2*t);
            const travel=p<.48?smooth(p/.48):1-smooth(Math.min(1,(p-.48)/.52));
            actorAlpha=reduceMotion?1:smooth(Math.min(1,p/.17,(1-p)/.17));
            wagon(0,reduceMotion?5.5:9.65-4.15*travel,travel*5);
            actorAlpha=1;
        }
        if(event==='vision') enemyModel(plannedWave.type,0,6.25,0,.8,true);
        for (const enemy of attackers) {
            modelPose={x:enemy.x,y:enemy.y,z:enemy.z,sin:Math.sin(enemy.yaw),cos:Math.cos(enemy.yaw)};
            enemyModel(enemy.type,0,0,0,1,false,enemy.age/1000);
            modelPose=null;
            if (event==='caravan' && enemy.age>1300) {
                const t=(enemy.age/570)%1;
                const px=5+(enemy.x-5)*t, py=4+(enemy.y-3)*t, pz=4+(enemy.z-4)*t;
                face([[px,py,pz],[px+.05,py+.06,pz-.4],[px-.05,py+.08,pz-.4]],0xffb96b);
            }
        }
        return mist;
    }
    function wagon(x,z,roll) {
        box(x,.61,z,1.24,.53,1.91,0x996743);
        box(x,.99,z-.22,.86,.58,.86,0xb49563);
        column(x,1.07,z+.49,.44,.45,.30,0xd3b986,7);
        for(const side of [-1,1]) for(const axle of [-.62,.62]) {
            const wx=x+side*.70, wz=z+axle;
            const wheel=Array.from({length:12},(_,i)=>[wx,.52+.36*Math.cos(i*tau/12),wz+.36*Math.sin(i*tau/12)]);
            face(wheel,0x594336);
            for(let i=0;i<3;i++) {
                const a=roll+i*Math.PI/3, dy=.29*Math.cos(a), dz=.29*Math.sin(a);
                const edge=wx+side*.025;
                rod([edge,.52-dy,wz-dz],[edge,.52+dy,wz+dz],.025,0xc29b68);
            }
        }
    }
    function wavePositions(defenders) {
        const result = [];
        const now = performance.now();
        for (const [i, el] of [...enemiesLayer.querySelectorAll('[data-enemy]')].entries()) {
            const age = reduceMotion ? 1500 : now-Number(el.dataset.start);
            if (age < 0) continue;
            const side = i%2 ? 1 : -1;
            const type = el.dataset.enemy;
            const t = Math.min(1,age*(type==='runner'?1.5:1)/1300);
            const clash = Math.max(0,Math.sin((age-1300)/900*tau));
            const x = side*(12*(1-t)+(1.45+Math.floor(i/2)*1.2)*t);
            const z = 4.6+2.9*t+(t===1?.28*clash:0);
            const y = type==='flyer'?1.9+.23*Math.sin(age/230):.04;
            const approach=Math.atan2(side*(1.45+Math.floor(i/2)*1.2-12),2.9);
            let closest={x:0,z:4}, minDistance=Infinity;
            for(const post of defenders) {
                const distance=Math.hypot(post.x-x,post.z-z);
                if(distance<minDistance){minDistance=distance;closest=post;}
            }
            const turn=Math.atan2(closest.x-x,closest.z-z)-approach;
            const yaw=approach+Math.atan2(Math.sin(turn),Math.cos(turn))*Math.max(0,(t-.72)/.28);
            result.push({x,y,z,type,age,yaw});
        }
        return result;
    }
    // Latitude bands give creatures rounded silhouettes and curved eye sockets.
    function oval(x,y,z,rx,ry,rz,color) {
        const sides=10, bands=6;
        let lower=ring(x,y-ry,z,0,sides);
        for (let row=1;row<=bands;row++) {
            const latitude=Math.PI*row/bands-Math.PI/2;
            const upper=ring(x,y+ry*Math.sin(latitude),z,rx*Math.cos(latitude),sides,rz/rx);
            for (let i=0;i<sides;i++) {
                const angle=tau*(i+.5)/sides;
                const worldAngle=angle-(modelPose ? Math.atan2(modelPose.sin,modelPose.cos) : 0);
                if ((.57*Math.cos(worldAngle)+.82*Math.sin(worldAngle))*Math.cos(latitude)+.46*Math.sin(latitude)<-.36) continue;
                const j=(i+1)%sides;
                face([lower[i],lower[j],upper[j],upper[i]],color,.88+.17*Math.sin(latitude)-.10*Math.cos(angle)*Math.cos(latitude));
            }
            lower=upper;
        }
    }
    function enemyModel(type,x,y,z,size,vision,age=0) {
        const r=size*(type==='boss'?1.46:type==='armored'?.89:.73);
        const step=vision?0:Math.sin(age*9);
        for (const side of [-1,1]) {
            const legX=x+side*r*.43, legZ=z+side*step*.19*r;
            column(legX,y+.11*r,legZ,.19*r,.59*r,.16*r,0x544850,5);
            box(legX,y+.065*r*Math.max(0,side*step),legZ+.09*r,.35*r,.20*r,.48*r,0x4a4145);
        }
        const center=y+(1.37+.065*Math.abs(step))*r;
        if (type==='goblin') {
            column(x,y+.47*r,z,.51*r,.72*r,.38*r,0x83634b,7);
            oval(x,center+.24*r,z,.57*r,.54*r,.44*r,0x92ae61);
            for (const side of [-1,1]) {
                face([[x+side*.40*r,center+.49*r,z],[x+side*.99*r,center+.73*r,z-.07*r],[x+side*.51*r,center+.16*r,z+.08*r]],0x91a967);
                oval(x+side*.22*r,center+.32*r,z+.39*r,.095*r,.077*r,.052*r,0xffce75);
                column(x+side*.48*r,y+.69*r,z+.11*r,.14*r,.43*r,.18*r,0x849d57,5);
            }
            column(x+.57*r,y+.71*r,z+step*.13*r,.09*r,.76*r,.16*r,0x71503d,5);
            face([[x-.14*r,center+.22*r,z+.4*r],[x+.12*r,center+.2*r,z+.4*r],[x,center+.09*r,z+.69*r]],0x74894e);
            return;
        }
        const skin=vision?0xb592da:type==='armored'?0x707a8c:type==='boss'?0x975879:0x80668a;
        oval(x,center,z,r,.91*r,.86*r,skin);
        // The eye faces forward in the creature’s local coordinates.
        const ex=x, ey=center+.17*r, ez=z+.78*r;
        oval(ex,ey,ez,.48*r,.47*r,.27*r,0xe9ddb7);
        oval(ex+.09*r,ey,ez+.21*r,.25*r,.28*r,.12*r,0xe59951);
        oval(ex+.12*r,ey,ez+.31*r,.105*r,.20*r,.055*r,0x2b2131);
        oval(ex+.15*r,ey+.10*r,ez+.35*r,.048*r,.055*r,.035*r,0xfff7db);
        if(type==='flyer') for(const side of [-1,1]) {
            const flap=Math.sin(age*6.4), flex=Math.sin(age*6.4-.55);
            const joint=(span,lift,sweep)=>[x+side*r*span,center+r*lift,z+r*sweep];
            const root=joint(.57,.18,-.12);
            const wrist=joint(1.40,.88+.53*flap,.19);
            const fingers=[joint(2.77,.53+.98*flex,-.47),joint(2.23,-.16+.78*flex,-1.10),
                joint(1.52,-.39+.53*flex,-1.28),joint(.72,-.35+.15*flex,-.87)];
            face([root,wrist,fingers[3]],0x874c68);
            for(let j=0;j<3;j++) {
                const a=fingers[j],b=fingers[j+1];
                const scallop=[(a[0]+b[0])/2,(a[1]+b[1])/2+r*.14,(a[2]+b[2])/2+r*.21];
                face([wrist,a,scallop],0xa75c76,.89+j*.035);
                face([wrist,scallop,b],0x82425c,1+j*.03);
            }
            rod(root,wrist,.075*r,0x543b50);
            for(const tip of fingers) rod(wrist,tip,.033*r,0x634558);
            face([wrist,joint(1.37,1.13+.53*flap,.29),joint(1.48,.90+.53*flap,.23)],0xe2c3a1);
        }
    }
    function drawClouds() {
        // Soft, shaded overlapping ellipsoids give each moving cloud volume.
        const unit=Math.min(width,height*1.65);
        const clouds=[[.14,.20,.16],[.53,.15,.11],[.88,.28,.16],[.06,.51,.13],[.91,.55,.12]];
        const lobes=[[-.49,.08,.48,.30],[-.24,-.05,.54,.42],[.08,-.12,.57,.47],[.39,.02,.49,.36],[.62,.10,.35,.25]];
        for(const [i,[start,y,size]] of clouds.entries()) {
            const travel=reduceMotion?0:time*(.004+i*.0007);
            const x=(((start+travel+.25)%1.5)+1.5)%1.5-.25;
            const r=unit*size;
            for(const [dx,dy,rx,ry] of lobes) {
                const cx=x*width+dx*r, cy=y*height+dy*r;
                const gradient=ctx.createRadialGradient(cx-rx*r*.3,cy-ry*r*.45,0,cx,cy,rx*r);
                gradient.addColorStop(0,hex(blend(0xfff9ef,0xc5cbe2,night))+'ed');
                gradient.addColorStop(.58,hex(blend(0xece8e2,0x929bb9,night))+'df');
                gradient.addColorStop(1,hex(blend(0xc6cbd1,0x626c8a,night))+'00');
                ctx.save();
                ctx.translate(cx,cy);
                ctx.scale(1,ry/rx);
                ctx.translate(-cx,-cy);
                ctx.fillStyle=gradient;
                ctx.beginPath(); ctx.arc(cx,cy,rx*r,0,tau); ctx.fill();
                ctx.restore();
            }
        }
    }
    function draw(now) {
        width=canvas.clientWidth; height=canvas.clientHeight;
        if(!width||!height) return;
        const ratio=Math.min(devicePixelRatio||1,2);
        const w=Math.round(width*ratio),h=Math.round(height*ratio);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        ctx.setTransform(ratio,0,0,ratio,0,0);
        time=reduceMotion?0:now/1000;
        const isNight=sceneElement.classList.contains('is-night')||sceneElement.classList.contains('is-defeat');
        if(isNight!==wasNight) {
            skyGoal+=Math.PI;
            wasNight=isNight;
        }
        const dt=Math.max(0,now-(lastSkyTime??now));
        lastSkyTime=now;
        skyAngle=reduceMotion?skyGoal:skyAngle+(skyGoal-skyAngle)*(1-Math.exp(-dt/950));
        const altitude=Math.sin(skyAngle);
        night=Math.max(0,Math.min(1,.5-altitude*.68));
        warmth=Math.pow(Math.max(0,1-Math.abs(altitude)),1.3);
        const dusk=light=>hex(blend(blend(light[0],light[1],night),light[2],warmth));
        const openHeight=Math.max(height*.52,height-(dock?.offsetHeight || 0)-24);
        // Reserve space for the near bank above the action panel on wide screens.
        scale=Math.min(width/38.5,openHeight/25.5);
        originY=Math.min(openHeight*.48,openHeight-15.6*scale);
        const sky=ctx.createLinearGradient(0,0,0,height);
        sky.addColorStop(0,dusk([0x536f9e,0x131735,0x745e88]));
        sky.addColorStop(.50,dusk([0xf4c9aa,0x544775,0xffac79]));
        sky.addColorStop(1,dusk([0xaaa9b5,0x393755,0xc19091]));
        ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
        ctx.globalAlpha=night;
        for(const [x,y,r] of stars){ctx.fillStyle='#d5d8ee';ctx.fillRect(x*width,y*height,r,r);}
        ctx.globalAlpha=1;
        for(const moon of [false,true]) {
            const angle=skyAngle+(moon?Math.PI:0), above=Math.sin(angle);
            if(above<-.15) continue;
            const sx=width*(.5-.43*Math.cos(angle)),sy=height*(.39-.27*above);
            const halo=ctx.createRadialGradient(sx,sy,0,sx,sy,height*.24);
            halo.addColorStop(0,moon?'#d7e1ff80':'#ffd4a3b0');halo.addColorStop(1,'#ffdeae00');
            ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
            ctx.fillStyle=moon?'#e1e4ff':'#ffe3b4';
            ctx.beginPath();ctx.arc(sx,sy,height*(moon?.031:.044),0,tau);ctx.fill();
        }
        for(let k=0;k<3;k++){
            ctx.beginPath();ctx.moveTo(0,height);
            for(let i=0;i<=28;i++)ctx.lineTo(width*i/28,height*(.38+k*.14-noise[(i+9*k)%64]*(.2-k*.04)));
            ctx.lineTo(width,height);ctx.closePath();ctx.fillStyle=dusk([[0xb6a9b7,0xa19aa9,0x828a99][k],[0x434466,0x383c60,0x323955][k],[0xb4898d,0x967782,0x826b77][k]]);ctx.fill();
        }
        drawClouds();
        faces.length=0;
        const [mistX,mistY] = world();
        faces.sort((a,b)=>a.depth-b.depth);
        for(const {vertices,fill,alpha} of faces){
            ctx.globalAlpha=alpha;
            ctx.beginPath();vertices.forEach((v,i)=>{const [x,y]=project(v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
            ctx.closePath();ctx.fillStyle=fill;ctx.fill();
        }
        ctx.globalAlpha=1;
        const mistRadius = scale*1.5;
        const mist = ctx.createRadialGradient(mistX,mistY,0,mistX,mistY,mistRadius);
        mist.addColorStop(0,hex(blend(0xedfafe,0xa9d1ea,night))+'b5');
        mist.addColorStop(1,'#e2f5ff00');
        ctx.fillStyle=mist;
        ctx.fillRect(mistX-mistRadius,mistY-mistRadius,mistRadius*2,mistRadius*2);
        const [cx,cy]=project([0,3.6,0]);
        const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*2.4);
        glow.addColorStop(0,'#8af9ef55');glow.addColorStop(1,'#88edff00');ctx.fillStyle=glow;ctx.fillRect(cx-scale*2.4,cy-scale*2.4,scale*4.8,scale*4.8);

    }
    sceneElement.classList.add('has-3d');
    let last=-Infinity;
    function frame(now){
        if(!document.hidden && now-last>=(reduceMotion?180:33)){draw(now);last=now;}
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
