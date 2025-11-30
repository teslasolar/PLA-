/**
 * Scene Export Utilities
 */
export class Export {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
    }

    screenshot(filename = 'pla-scene.png') {
        this.renderer.render(this.scene, this.camera);
        const data = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        link.click();
    }

    toJSON() {
        const data = { poles: [], conductors: [], camera: {} };

        this.scene.traverse(obj => {
            if (obj.userData.type === 'pole') {
                data.poles.push({
                    position: obj.position.toArray(),
                    config: obj.userData.config
                });
            }
            if (obj.userData.type === 'conductor') {
                data.conductors.push({
                    config: obj.userData.config,
                    catenary: obj.userData.catenary
                });
            }
        });

        data.camera = {
            position: this.camera.position.toArray(),
            target: [0, 10, 0]
        };

        return JSON.stringify(data, null, 2);
    }

    download(filename = 'pla-project.json') {
        const data = this.toJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    static fromJSON(json, scene) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;

        for (const pole of data.poles || []) {
            // Recreate poles using PoleMesh
            console.log('Load pole:', pole);
        }

        for (const cond of data.conductors || []) {
            // Recreate conductors using ConductorMesh
            console.log('Load conductor:', cond);
        }

        return data;
    }
}

export default Export;
