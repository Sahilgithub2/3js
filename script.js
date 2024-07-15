class ThreeJSDrawingApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xffffff);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.z = 5;

        this.gridHelper = new THREE.GridHelper(window.innerWidth, 40, 0xd3d3d3, 0xd3d3d3);
        this.gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(this.gridHelper);

        this.vertices = [];
        this.drawingObject = null;
        this.isDrawing = true;
        this.copiedObject = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDragging = false;

        this.setupEventListeners();
        this.animate();
    }

    setupEventListeners() {
        const throttledMouseMove = this.throttle(this.onMouseMove.bind(this), 16);

        window.addEventListener('mousemove', throttledMouseMove);
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('click', this.onClick.bind(this));

        document.getElementById('completeBtn').addEventListener('click', this.completeDrawing.bind(this));
        document.getElementById('copyBtn').addEventListener('click', this.copyDrawing.bind(this));

        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', this.reset.bind(this));
    }

    throttle(fn, limit) {
        let lastCall = 0;
        return function (...args) {
            const now = (new Date()).getTime();
            if (now - lastCall < limit) {
                return;
            }
            lastCall = now;
            return fn(...args);
        };
    }

    onMouseMove(event) {
        if (!this.isDragging) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.gridHelper);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            if (this.copiedObject) {
                this.copiedObject.position.copy(point);
            }
        }
    }

    onMouseDown(event) {
        if (event.button === 0 && this.copiedObject) {
            this.isDragging = true;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.gridHelper);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                this.copiedObject.position.copy(point);
            }
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onClick(event) {
        if (this.isDrawing) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
            vector.unproject(this.camera);
            vector.z = 0;
            this.vertices.push(vector);

            this.drawVertices();
        } else if (this.copiedObject) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.gridHelper);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                this.copiedObject.position.copy(point);
            }
        }
    }

    drawVertices() {
        if (this.drawingObject) this.scene.remove(this.drawingObject);

        const geometry = new THREE.BufferGeometry().setFromPoints(this.vertices);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        this.drawingObject = new THREE.LineLoop(geometry, material);

        this.scene.add(this.drawingObject);
    }

    completeDrawing() {
        if (this.vertices.length > 2) {
            this.isDrawing = false;

            if (this.drawingObject) this.scene.remove(this.drawingObject);

            const shape = new THREE.Shape(this.vertices.map(v => new THREE.Vector2(v.x, v.y)));
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
            this.drawingObject = new THREE.Mesh(geometry, material);

            this.scene.add(this.drawingObject);

            const edges = new THREE.EdgesGeometry(geometry);
            const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
            const edgesMesh = new THREE.LineSegments(edges, edgesMaterial);
            this.drawingObject.add(edgesMesh);
        }
    }

    copyDrawing() {
        if (this.drawingObject && !this.isDrawing && !this.copiedObject) {
            const geometry = this.drawingObject.geometry.clone();
            const material = this.drawingObject.material.clone();
            material.color.setHex(0xff00ff);
            this.copiedObject = new THREE.Mesh(geometry, material);
            this.scene.add(this.copiedObject);
        }
    }

    reset() {
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn.disabled) return;

        resetBtn.disabled = true;

        this.vertices = [];
        this.isDrawing = true;
        if (this.drawingObject) {
            this.scene.remove(this.drawingObject);
            this.drawingObject.geometry.dispose();
            this.drawingObject.material.dispose();
            this.drawingObject = null;
        }
        if (this.copiedObject) {
            this.scene.remove(this.copiedObject);
            this.copiedObject.geometry.dispose();
            this.copiedObject.material.dispose();
            this.copiedObject = null;
        }

        setTimeout(() => {
            resetBtn.disabled = false;
        }, 1000);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}

const app = new ThreeJSDrawingApp();
