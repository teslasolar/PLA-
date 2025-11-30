// Photo Attachments - Link site photos to poles
import { getState, setState } from './state.js';

// Photo storage (in-memory, could be extended to IndexedDB)
const photoStore = new Map();

export function addPhoto(poleId, file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const photo = {
                id: `photo_${Date.now()}`,
                poleId,
                data: e.target.result,
                name: file.name,
                size: file.size,
                type: file.type,
                timestamp: new Date().toISOString(),
                caption: '',
                tags: []
            };

            // Store photo
            if (!photoStore.has(poleId)) {
                photoStore.set(poleId, []);
            }
            photoStore.get(poleId).push(photo);

            // Update pole with photo reference
            const state = getState();
            const pole = state.poles.find(p => p.id === poleId);
            if (pole) {
                pole.photos = pole.photos || [];
                pole.photos.push(photo.id);
                setState({ ...state });
            }

            resolve(photo);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function addPhotoFromURL(poleId, url, caption = '') {
    const photo = {
        id: `photo_${Date.now()}`,
        poleId,
        url,
        name: url.split('/').pop(),
        timestamp: new Date().toISOString(),
        caption,
        tags: []
    };

    if (!photoStore.has(poleId)) {
        photoStore.set(poleId, []);
    }
    photoStore.get(poleId).push(photo);

    return photo;
}

export function getPhotos(poleId) {
    return photoStore.get(poleId) || [];
}

export function getAllPhotos() {
    const all = [];
    photoStore.forEach((photos, poleId) => {
        photos.forEach(p => all.push({ ...p, poleId }));
    });
    return all;
}

export function deletePhoto(poleId, photoId) {
    const photos = photoStore.get(poleId);
    if (!photos) return false;

    const index = photos.findIndex(p => p.id === photoId);
    if (index === -1) return false;

    photos.splice(index, 1);

    // Update pole reference
    const state = getState();
    const pole = state.poles.find(p => p.id === poleId);
    if (pole && pole.photos) {
        pole.photos = pole.photos.filter(id => id !== photoId);
        setState({ ...state });
    }

    return true;
}

export function updatePhotoCaption(poleId, photoId, caption) {
    const photos = photoStore.get(poleId);
    if (!photos) return false;

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return false;

    photo.caption = caption;
    return true;
}

export function addPhotoTag(poleId, photoId, tag) {
    const photos = photoStore.get(poleId);
    if (!photos) return false;

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return false;

    if (!photo.tags.includes(tag)) {
        photo.tags.push(tag);
    }
    return true;
}

export function searchPhotos(query) {
    const results = [];
    photoStore.forEach((photos, poleId) => {
        photos.forEach(photo => {
            const matchCaption = photo.caption?.toLowerCase().includes(query.toLowerCase());
            const matchTag = photo.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()));
            const matchName = photo.name?.toLowerCase().includes(query.toLowerCase());

            if (matchCaption || matchTag || matchName) {
                results.push({ ...photo, poleId });
            }
        });
    });
    return results;
}

export function generatePhotoGallery(poleId) {
    const photos = getPhotos(poleId);

    if (photos.length === 0) {
        return '<div class="no-photos">No photos attached</div>';
    }

    return `
        <div class="photo-gallery">
            ${photos.map(photo => `
                <div class="photo-item" data-photo-id="${photo.id}">
                    <div class="photo-thumb">
                        <img src="${photo.data || photo.url}" alt="${photo.name}" onclick="window.viewPhoto('${poleId}', '${photo.id}')">
                    </div>
                    <div class="photo-info">
                        <div class="photo-name">${photo.name}</div>
                        <div class="photo-caption">${photo.caption || 'No caption'}</div>
                        <div class="photo-tags">${(photo.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                    </div>
                    <div class="photo-actions">
                        <button class="btn btn-sm" onclick="window.editPhotoCaption('${poleId}', '${photo.id}')">Edit</button>
                        <button class="btn btn-sm danger" onclick="window.deletePhotoConfirm('${poleId}', '${photo.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

export function showPhotoDialog(poleId) {
    const modal = document.getElementById('photoModal');
    const content = document.getElementById('photoContent');

    if (content) {
        content.innerHTML = `
            <div class="photo-panel">
                <div class="photo-header">
                    <h4>Photos - ${poleId}</h4>
                    <div class="photo-upload">
                        <input type="file" id="photoInput" accept="image/*" multiple style="display:none" onchange="window.handlePhotoUpload(event, '${poleId}')">
                        <button class="btn success" onclick="document.getElementById('photoInput').click()">📷 Add Photo</button>
                        <input type="text" id="photoURL" class="input" placeholder="Or paste URL..." style="width:200px;">
                        <button class="btn" onclick="window.addPhotoURL('${poleId}')">Add URL</button>
                    </div>
                </div>
                <div id="photoGallery">
                    ${generatePhotoGallery(poleId)}
                </div>
            </div>
        `;
    }

    // Expose functions to window
    window.handlePhotoUpload = async (event, pid) => {
        const files = event.target.files;
        for (const file of files) {
            await addPhoto(pid, file);
        }
        document.getElementById('photoGallery').innerHTML = generatePhotoGallery(pid);
    };

    window.addPhotoURL = (pid) => {
        const url = document.getElementById('photoURL').value.trim();
        if (url) {
            addPhotoFromURL(pid, url);
            document.getElementById('photoGallery').innerHTML = generatePhotoGallery(pid);
            document.getElementById('photoURL').value = '';
        }
    };

    window.viewPhoto = (pid, photoId) => {
        const photos = getPhotos(pid);
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        const viewer = window.open('', '_blank');
        viewer.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>${photo.name}</title>
            <style>
                body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; max-height: 100vh; }
            </style>
            </head>
            <body><img src="${photo.data || photo.url}"></body>
            </html>
        `);
    };

    window.editPhotoCaption = (pid, photoId) => {
        const photos = getPhotos(pid);
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        const caption = prompt('Caption:', photo.caption || '');
        if (caption !== null) {
            updatePhotoCaption(pid, photoId, caption);
            document.getElementById('photoGallery').innerHTML = generatePhotoGallery(pid);
        }
    };

    window.deletePhotoConfirm = (pid, photoId) => {
        if (confirm('Delete this photo?')) {
            deletePhoto(pid, photoId);
            document.getElementById('photoGallery').innerHTML = generatePhotoGallery(pid);
        }
    };

    if (modal) modal.style.display = 'flex';
}

// Export photos data for project save
export function exportPhotos() {
    const data = {};
    photoStore.forEach((photos, poleId) => {
        data[poleId] = photos;
    });
    return data;
}

// Import photos data from project load
export function importPhotos(data) {
    photoStore.clear();
    if (data) {
        Object.entries(data).forEach(([poleId, photos]) => {
            photoStore.set(poleId, photos);
        });
    }
}
