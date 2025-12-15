(() =>{
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const headerElement = document.querySelector('header');
    const footerElement = document.querySelector('footer');

    const SCALE = 30;

    const resizeCanvas = () =>{
        const headerHight = headerElement?.offsetHeight ?? 0;
        const footerHeight = footerElement?.offsetHeight ?? 0;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - headerHight - footerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const pl = planck;
    const Vec2 = pl.Vec2;

    const createWorld=() =>{
        const world = new pl.World({
            gravity: Vec2(0,-10)
        })

        const ground = world.createBody();
        ground.createFixture(pl.Edge(Vec2(-50,0), Vec2(50,0)),{
            friction: 0.8
        });

        return {world, ground};
    }

    const {world, ground} = createWorld();

    const TIME_STEP = (1/60);
    const VELOCITY_ITERS = 8;
    const POSITION_ITERS = 3;

    const BIRD_RADIUS = 0.5;
    const BIRD_START = Vec2(5,5);
    const BIRD_STOP_SPEED = 0.15;
    const BIRD_STOP_ANGULAR = 0.25;
    const BIRD_IDLE_SECONDS = 1.0;
    const BIRD_MAX_FLIGHT_SECONDS = 10.0;
    const PIG_RADIUS = 0.3;

    //Mockup
    const loadLevels = () =>([
        {
            pigs: [{x:2, y:1}],
            boxes: [
                {x:15, y:1, width:1, height:2},
                {x:20, y:1, width:1, height:2},
                {x:23, y:3, width:1, height:2},
            ]
        },
        {
            pigs: [{x:2, y:1}, {x:4, y:1}],
            boxes: [
                {x:15, y:1, width:1, height:2},
                {x:20, y:1, width:1, height:2},
                {x:23, y:3, width:3, height:0.5},
                {x:21, y:3, width:3, height:0.5},
                {x:20, y:3, width:3, height:0.5},
            ]
        }
    ]);

    let state = {
        levels: loadLevels(),
        currentLevel: 0,
        score: 0,
        birdsRemaining: 3,
        isLevelCompleted: false,
        pigs: [],
        boxes: [],
        bird: null,
        birdLaunched: false,
        isMouseDown: false,
        mousePos: Vec2(0,0),
        launchVector: Vec2(0,0)
    };

    const setState = (patch) =>{
        state = {...state, ...patch};
    };

    let birdIdleTime = 0;
    let birdFlightTime = 0;
    let levelCompleteTimer = null;
    let gameOverTimer = null;

    const resetBirdTimers = () =>{
        birdIdleTime = 0;
        birdFlightTime = 0;
    };

    // --------------------------------------------------------
    // plank utils (physics)

    const createBox = (x, y, width, height, dynamic = true)=>{
        const body = world.createBody({
            position: Vec2(x,y),
            type: dynamic ? 'dynamic' : 'static'
        });

        body.createFixture(pl.Box(width/2, height/2), {
            density: 1.0,
            friction: 0.5,
            restitution: 0.1
        });

        return body;
    };

    const createPig = (x, y)=>{
        const body = world.createDynamicBody({
            position: Vec2(x,y)
        });

        body.createFixture(pl.Circle(PIG_RADIUS), {
            density: 0.5,
            friction: 0.5,
            restitution: 0.1,
            userData: 'Pig'
        });

        body.isPig = true;

        return body;
    };

    const createBird =()=>{
        const body = world.createDynamicBody(BIRD_START);
        body.createFixture(pl.Circle(BIRD_RADIUS),{
            density: 1.5,
            friction: 0.6,
            restitution: 0.4
        });

        body.setLinearDamping(0.35);
        body.setAngularDamping(0.35);
        body.setSleepingAllowed(true);

        return body;
    };

    const destroyBirdIfExists = () => {
        if(state.bird){
            world.destroyBody(state.bird);
        }
    };

    const clearWorldExceptGround = () =>{
        for(let body = world.getBodyList(); body;){
            const next = body.getNext();
            if(body !== ground) world.destroyBody(body);
            body = next;
        }
    };

    // --------------------------------------------------------
    // level utils

    const initLevel = (levelIndex) => {
        if(levelCompleteTimer){
            levelCompleteTimer = null;
        }

        if(gameOverTimer){
            gameOverTimer = null;
        }

        clearWorldExceptGround();
        const level = state.levels[levelIndex];

        const boxes = level.boxes.map(b => createBox(b.x, b.y, b.width, b.height, true));
        const pigs = level.pigs.map(p => createPig(p.x, p.y));

        const bird = createBird();

        setState({
            pigs,
            boxes,
            bird,
            isLevelCompleted: false,
            birdLaunched: false,
            birdsRemaining:3,
            isMouseDown: false,
            mousePos: Vec2(0,0),
            launchVector: Vec2(0,0)
        });
    };

    const resetLEvel =()=> initLevel(state.currentLevel);
    const nextLevel = () => {
        const next = state.currentLevel + 1;
        if(next < state.levels.length) {
            setState({currentLevel: next});
            initLevel(next);
            return;
        }

        alert("Congratulations! You've won c:");
        setState({currentLevel: 0, score: 0});
        initLevel(0);
    }

    // --------------------------------------------------------
    // input utils
    const getMouseWorldPos = (event) =>{
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left) / SCALE;
        const mouseY = (canvas.height - (event.clientY - rect.top)) / SCALE;
        return Vec2(mouseX, mouseY);
    };

    const isPointOnBird = (point) =>{
        
        const birdPos = state.bird?.getPosition();
        
        if(!birdPos) return false;
        return Vec2.distance(birdPos, point) < BIRD_RADIUS;
    };

    // --------------------------------------------------------
    // Listeners

    canvas.addEventListener("mousedown", (e) =>{
        if(state.birdsRemaining <=0 || state.birdLaunched || !state.bird) return;

        const worldPos = getMouseWorldPos(e);
        
        if(isPointOnBird(worldPos)) {
            setState({isMouseDown: true, mousePos: worldPos});
        }
    });

    canvas.addEventListener("mousemove", (e) =>{
        if(!state.isMouseDown || !state.bird) return;

        const worldPos = getMouseWorldPos(e);
        const launchVector = Vec2.sub(state.bird.getPosition(), worldPos);

        setState({
            mousePos: worldPos,
            launchVector
        })
    })

    canvas.addEventListener("mouseup", () =>{
        if(!state.isMouseDown || !state.bird) return;

        const bird = state.bird;
        bird.setLinearVelocity(Vec2(0,0));
        bird.setAngularVelocity(0);

        const impulse = state.launchVector.mul(5);
        
        bird.applyLinearImpulse(impulse, bird.getWorldCenter(), true);
        resetBirdTimers();

        setState({
            isMouseDown: false,
            birdLaunched: true,
            birdsRemaining: state.birdsRemaining-1,
        });
    });

    // --------------------------------------------------------
    // Collision Logic
    const isGround = (body) => body === ground;

    world.on("post-solve", (contact, impulse) =>{
        if(!impulse) return;

        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();
        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        if(!(bodyA.isPig || bodyB.isPig)) return;

        const pigBody = bodyA.isPig ? bodyA : bodyB;
        const otherBody = bodyB.isPig ? bodyB : bodyA;

        if(isGround(otherBody)) return;

        const normalImpulse = impulse.normalImpulses?.[0] ?? 0;

        if(normalImpulse > 1.0){
            pigBody.isDestroyed = true;
        }
    });

    // --------------------------------------------------------
    // Update step
    const updateBirdTimers = () =>{
        const bird = state.bird;
        if(!state.birdLaunched || !bird) return;

        birdFlightTime += TIME_STEP;

        const speed = bird.getLinearVelocity().length();
        const ang = Math.abs(bird.getAngularVelocity());

        if(speed < BIRD_STOP_SPEED && ang < BIRD_STOP_ANGULAR && !state.isMouseDown){
            birdIdleTime += TIME_STEP;
        } else{
            birdIdleTime = 0;
        }
    };

    const shouldRespawnBird = () =>{
        const bird = state.bird;
        if(!state.birdLaunched || !bird) return false;

        const pos = bird.getPosition();

        const outRight = pos.x > 50;
        const outLow = pos.y < -10;
        const idleLongEnough = birdIdleTime >= BIRD_IDLE_SECONDS;
        const timedOut = birdFlightTime >= BIRD_MAX_FLIGHT_SECONDS;

        return outRight || outLow || idleLongEnough || timedOut;
    };

    const handlePigsCleanup = () => {
        const remaining = state.pigs.filter(pig =>{
            if(!pig.isDestroyed) return true;

            world.destroyBody(pig);
            return false;
        });

        const removedCount = state.pigs.length - remaining.length;
        if(removedCount > 0){
            setState({
                pigs: remaining,
                score: state.score + removedCount * 100
            });
        }
    };

    const checkLevelComplete = () => {
        if(state.isLevelCompleted) return;
        if(state.pigs.length > 0) return;

        setState({isLevelCompleted: true});
        if(!levelCompleteTimer){
            levelCompleteTimer = setTimeout(() =>{
                levelCompleteTimer = null;
                alert("Level complete");
                nextLevel();
            }, 500);
        }
    };

    const respawnBird = () =>{
        destroyBirdIfExists();

        const bird = createBird();
        resetBirdTimers();
        setState({
            bird,
            birdLaunched: false,
            isMouseDown: false,
            launchVector: Vec2(0,0)
        });
    };

    const handleBirdLifecycle = () =>{
        if(!shouldRespawnBird()) return;

        if(state.birdsRemaining > 0){
            respawnBird();
            return;
        }

        if(!state.isLevelCompleted && !gameOverTimer){
            gameOverTimer = setTimeout(() =>{
                gameOverTimer = null;
                alert("Game Over!");
                resetLEvel();
            }, 500);
        }
    };

    const update = () =>{
        world.step(TIME_STEP, VELOCITY_ITERS, POSITION_ITERS);

        updateBirdTimers();
        handlePigsCleanup();
        checkLevelComplete();
        handleBirdLifecycle();
    }

    // --------------------------------------------------------
    // Rendering
    const toCanvasY = (yMeters) => canvas.height - yMeters * SCALE;

    const drawnGround = () =>{
        ctx.beginPath();
        ctx.moveTo(0, toCanvasY(0));
        ctx.lineTo(canvas.width, toCanvasY(0));
        ctx.strokeStyle = "#290b50ff";
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const drawBoxes = () =>{
        state.boxes.forEach(box =>{
            const position = box.getPosition();
            const angle = box.getAngle();
            const shape = box.getFixtureList().getShape();
            const vertices = shape.m_vertices;

            ctx.save();
            ctx.translate(position.x * SCALE, toCanvasY(position.y));
            ctx.rotate(-angle);

            ctx.beginPath();
            ctx.moveTo(vertices[0].x * SCALE, -vertices[0].y * SCALE);

            for(let i =1; i<vertices.length; i++){
                ctx.lineTo(vertices[i].x * SCALE, -vertices[i].y * SCALE);
            }

            ctx.closePath();
            ctx.fillStyle = "#795548";
            ctx.fill();
            ctx.restore();
        });
    };

    const drawPigs = () =>{
        state.pigs.forEach(pig =>{
            const position = pig.getPosition();
            const angle = pig.getAngle();
            ctx.beginPath();

            // posicion X, posicion Y, radio, angulo de inicio (0), angulo de fimal (360)
            ctx.arc(position.x * SCALE, toCanvasY(position.y), PIG_RADIUS * SCALE, 0, 2*Math.PI);
            ctx.fillStyle = '#117511ff';
            ctx.fill();
        });
    };

    const drawBird = () => {
        if(!state.bird) return;
        const pos = state.bird.getPosition();

        ctx.beginPath();
        ctx.arc(pos.x * SCALE, toCanvasY(pos.y), BIRD_RADIUS * SCALE, 0, Math.PI * 2);
        ctx.fillStyle = "#f44336";
        ctx.fill();
    };

    drawLaunchLine = () =>{
        if(!state.isMouseDown || !state.bird) return;
        const birdPos = state.bird.getPosition();
        ctx.beginPath();
        ctx.moveTo(birdPos.x * SCALE, toCanvasY(birdPos.y));
        ctx.lineTo(state.mousePos.x * SCALE, toCanvasY(state.mousePos.y));

        ctx.strokeStyle = "#9e9e9e";
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const drawHUD = () =>{
        ctx.fillStyle ="#000";
        ctx.font = "16px Arial";
        ctx.fillText(`Score: ${state.score}`, 10, 20);
        ctx.fillText(`Level: ${state.currentLevel}`, 10, 40);
        ctx.fillText(`Birds remaining: ${state.birdsRemaining}`, 10, 60);
    }

    const draw = () => {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        
        drawnGround();
        drawBoxes();
        drawPigs();
        drawBird();
        drawLaunchLine();
        drawHUD();
    };

    const loop = () =>{
        update();
        draw();
        requestAnimationFrame(loop);
    }

    initLevel(state.currentLevel);
    loop();
})();