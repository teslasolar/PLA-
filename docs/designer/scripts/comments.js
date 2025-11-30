// Comments - Add notes to poles/spans
import { getState, setState } from './state.js';

const COMMENT_TYPES = {
    note: { icon: '📝', label: 'Note', color: '#3b82f6' },
    issue: { icon: '⚠️', label: 'Issue', color: '#f59e0b' },
    question: { icon: '❓', label: 'Question', color: '#8b5cf6' },
    resolved: { icon: '✅', label: 'Resolved', color: '#10b981' },
    critical: { icon: '🚨', label: 'Critical', color: '#ef4444' }
};

let comments = [];

export function initComments() {
    loadComments();
}

export function addComment(targetId, targetType, text, type = 'note', author = 'User') {
    const comment = {
        id: `cmt_${Date.now()}`,
        targetId,
        targetType, // 'pole', 'span', 'project'
        text,
        type,
        author,
        timestamp: new Date().toISOString(),
        replies: [],
        resolved: false
    };

    comments.push(comment);
    saveComments();

    // Dispatch event for UI update
    window.dispatchEvent(new CustomEvent('commentAdded', { detail: comment }));

    return comment;
}

export function addReply(commentId, text, author = 'User') {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return null;

    const reply = {
        id: `rep_${Date.now()}`,
        text,
        author,
        timestamp: new Date().toISOString()
    };

    comment.replies.push(reply);
    saveComments();

    return reply;
}

export function updateComment(commentId, updates) {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return false;

    Object.assign(comment, updates);
    saveComments();

    return true;
}

export function resolveComment(commentId) {
    return updateComment(commentId, { resolved: true, type: 'resolved' });
}

export function deleteComment(commentId) {
    const index = comments.findIndex(c => c.id === commentId);
    if (index === -1) return false;

    comments.splice(index, 1);
    saveComments();

    return true;
}

export function getComments(targetId = null, targetType = null, includeResolved = true) {
    let filtered = comments;

    if (targetId) {
        filtered = filtered.filter(c => c.targetId === targetId);
    }

    if (targetType) {
        filtered = filtered.filter(c => c.targetType === targetType);
    }

    if (!includeResolved) {
        filtered = filtered.filter(c => !c.resolved);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function getCommentsCount(targetId) {
    return comments.filter(c => c.targetId === targetId && !c.resolved).length;
}

export function getAllUnresolvedCount() {
    return comments.filter(c => !c.resolved).length;
}

export function searchComments(query) {
    const q = query.toLowerCase();
    return comments.filter(c =>
        c.text.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.replies.some(r => r.text.toLowerCase().includes(q))
    );
}

function saveComments() {
    localStorage.setItem('pla-comments', JSON.stringify(comments));

    // Also attach to state for project save
    const state = getState();
    state.comments = comments;
}

function loadComments() {
    const saved = localStorage.getItem('pla-comments');
    if (saved) {
        try {
            comments = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load comments:', e);
        }
    }
}

export function generateCommentHTML(comment) {
    const typeInfo = COMMENT_TYPES[comment.type] || COMMENT_TYPES.note;
    const date = new Date(comment.timestamp).toLocaleString();

    return `
        <div class="comment ${comment.resolved ? 'resolved' : ''}" data-id="${comment.id}">
            <div class="comment-header">
                <span class="comment-icon" style="color:${typeInfo.color}">${typeInfo.icon}</span>
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${date}</span>
                <span class="comment-type">${typeInfo.label}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
            ${comment.replies.length > 0 ? `
                <div class="comment-replies">
                    ${comment.replies.map(r => `
                        <div class="reply">
                            <span class="reply-author">${r.author}</span>
                            <span class="reply-time">${new Date(r.timestamp).toLocaleString()}</span>
                            <div class="reply-text">${escapeHtml(r.text)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="comment-actions">
                <button class="btn btn-sm" onclick="window.replyToComment('${comment.id}')">Reply</button>
                ${!comment.resolved ? `
                    <button class="btn btn-sm success" onclick="window.resolveCommentById('${comment.id}')">Resolve</button>
                ` : ''}
                <button class="btn btn-sm danger" onclick="window.deleteCommentById('${comment.id}')">Delete</button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function showCommentsPanel(targetId = null, targetType = null) {
    const modal = document.getElementById('commentsModal');
    const content = document.getElementById('commentsContent');

    if (!content) return;

    const commentsList = getComments(targetId, targetType);
    const title = targetId ? `Comments - ${targetId}` : 'All Comments';

    content.innerHTML = `
        <div class="comments-panel">
            <div class="comments-header">
                <h4>${title}</h4>
                <div class="comments-filter">
                    <label>
                        <input type="checkbox" id="showResolved" ${content.dataset.showResolved === 'true' ? 'checked' : ''} onchange="window.toggleShowResolved()">
                        Show Resolved
                    </label>
                </div>
            </div>

            <div class="add-comment">
                <select id="commentType" class="input">
                    ${Object.entries(COMMENT_TYPES).map(([k, v]) =>
                        `<option value="${k}">${v.icon} ${v.label}</option>`
                    ).join('')}
                </select>
                <textarea id="commentText" class="input" placeholder="Add a comment..." rows="2"></textarea>
                <button class="btn success" onclick="window.submitComment('${targetId}', '${targetType}')">Add Comment</button>
            </div>

            <div class="comments-list">
                ${commentsList.length === 0 ?
                    '<div class="no-comments">No comments yet</div>' :
                    commentsList.map(c => generateCommentHTML(c)).join('')
                }
            </div>

            <div class="comments-summary">
                <span>${getAllUnresolvedCount()} unresolved</span>
                <span>${comments.length} total</span>
            </div>
        </div>
    `;

    // Expose functions
    window.submitComment = (tid, ttype) => {
        const text = document.getElementById('commentText').value.trim();
        const type = document.getElementById('commentType').value;

        if (text) {
            addComment(tid || 'project', ttype || 'project', text, type);
            showCommentsPanel(tid, ttype);
        }
    };

    window.replyToComment = (commentId) => {
        const text = prompt('Reply:');
        if (text) {
            addReply(commentId, text);
            showCommentsPanel(targetId, targetType);
        }
    };

    window.resolveCommentById = (commentId) => {
        resolveComment(commentId);
        showCommentsPanel(targetId, targetType);
    };

    window.deleteCommentById = (commentId) => {
        if (confirm('Delete this comment?')) {
            deleteComment(commentId);
            showCommentsPanel(targetId, targetType);
        }
    };

    window.toggleShowResolved = () => {
        content.dataset.showResolved = document.getElementById('showResolved').checked;
        showCommentsPanel(targetId, targetType);
    };

    if (modal) modal.style.display = 'flex';
}

// Comment indicator badges for poles/spans
export function updateCommentBadges() {
    const state = getState();

    state.poles?.forEach(pole => {
        const count = getCommentsCount(pole.id);
        const el = document.querySelector(`[data-pole-id="${pole.id}"] .comment-badge`);
        if (el) {
            el.textContent = count || '';
            el.style.display = count > 0 ? 'block' : 'none';
        }
    });

    state.spans?.forEach(span => {
        const count = getCommentsCount(span.id);
        const el = document.querySelector(`[data-span-id="${span.id}"] .comment-badge`);
        if (el) {
            el.textContent = count || '';
            el.style.display = count > 0 ? 'block' : 'none';
        }
    });
}

// Quick comment from right-click
export function showQuickComment(targetId, targetType, x, y) {
    const existing = document.querySelector('.quick-comment');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'quick-comment';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.innerHTML = `
        <input type="text" placeholder="Quick note..." id="quickCommentInput">
        <button onclick="window.submitQuickComment('${targetId}', '${targetType}')">Add</button>
    `;

    document.body.appendChild(popup);

    const input = document.getElementById('quickCommentInput');
    input.focus();
    input.onkeydown = (e) => {
        if (e.key === 'Enter') window.submitQuickComment(targetId, targetType);
        if (e.key === 'Escape') popup.remove();
    };

    window.submitQuickComment = (tid, ttype) => {
        const text = document.getElementById('quickCommentInput').value.trim();
        if (text) {
            addComment(tid, ttype, text);
            updateCommentBadges();
        }
        popup.remove();
    };

    setTimeout(() => {
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target)) popup.remove();
        }, { once: true });
    }, 100);
}

export { comments, COMMENT_TYPES };
