// Global Variables
let pageCount = 1;
let selectedElement = null;
let currentFont = 'Arial';
let currentFontSize = 14;
let selectedPageForSettings = 1;
let currentActivePage = 1;

// Advanced History System
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 150;
let isRestoring = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupIntersectionObserver();
    updatePageIndicator();
    saveState();
});

// ===== PAGE TRACKING =====
function setupIntersectionObserver() {
    const options = {
        root: document.getElementById('workspace'),
        threshold: [0.1, 0.5, 0.9]
    };
    
    const observer = new IntersectionObserver((entries) => {
        if (isRestoring) return;
        
        let maxRatio = 0;
        let mostVisible = null;
        
        entries.forEach(entry => {
            if (entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                mostVisible = entry.target;
            }
        });
        
        if (mostVisible && maxRatio > 0.1) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
            mostVisible.classList.add('active-page');
            currentActivePage = parseInt(mostVisible.dataset.page);
            updatePageIndicator();
        }
    }, options);
    
    document.querySelectorAll('.page').forEach(page => observer.observe(page));
    window.pageObserver = observer;
}

function updatePageIndicator() {
    const total = document.querySelectorAll('.page').length;
    document.getElementById('currentPageIndicator').textContent = `Seite ${currentActivePage} / ${total}`;
}

// ===== TEXT BOX MANAGEMENT =====
function addTextBox() {
    const page = document.querySelector(`.page[data-page="${currentActivePage}"] .page-content`);
    const pageColor = document.querySelector(`.page[data-page="${currentActivePage}"]`).dataset.color;
    
    const textBox = createTextBox(pageColor);
    page.appendChild(textBox);
    
    selectElement(textBox);
    textBox.querySelector('textarea').focus();
    saveState();
}

function createTextBox(pageColor, data = {}) {
    const textBox = document.createElement('div');
    textBox.className = 'text-box';
    textBox.style.left = data.left || '50px';
    textBox.style.top = data.top || '50px';
    textBox.style.width = data.width || '300px';
    textBox.style.height = data.height || '100px';
    textBox.style.fontFamily = data.fontFamily || currentFont;
    textBox.style.fontSize = data.fontSize || currentFontSize + 'px';
    textBox.style.fontWeight = data.fontWeight || 'normal';
    textBox.style.fontStyle = data.fontStyle || 'normal';
    textBox.style.textDecoration = data.textDecoration || 'none';
    textBox.style.textAlign = data.textAlign || 'left';
    textBox.dataset.paper = pageColor;
    textBox.dataset.id = data.id || Date.now();
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Text eingeben...';
    textarea.value = data.content || '';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        textBox.remove();
        selectedElement = null;
        saveState();
    };
    
    // Resize Handles
    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.dataset.position = pos;
        textBox.appendChild(handle);
        makeResizable(handle, textBox);
    });
    
    textBox.appendChild(textarea);
    textBox.appendChild(deleteBtn);
    
    // Event Listeners
    textarea.addEventListener('input', () => saveState());
    textarea.addEventListener('paste', () => setTimeout(saveState, 10));
    textarea.addEventListener('cut', () => setTimeout(saveState, 10));
    
    const page = textBox.closest('.page-content') || document.querySelector(`.page[data-page="${currentActivePage}"] .page-content`);
    makeDraggable(textBox, page);
    
    textBox.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('resize-handle')) {
            selectElement(textBox);
        }
    });
    
    return textBox;
}

// ===== DRAG & RESIZE =====
function makeDraggable(element, container) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let moved = false;
    
    element.onmousedown = function(e) {
        const textarea = element.querySelector('textarea');
        if (e.target === textarea || e.target.classList.contains('resize-handle')) return;
        
        e.preventDefault();
        moved = false;
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmousemove = elementDrag;
        document.onmouseup = closeDrag;
    };
    
    function elementDrag(e) {
        e.preventDefault();
        moved = true;
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;
        
        const maxLeft = container.offsetWidth - element.offsetWidth;
        const maxTop = container.offsetHeight - element.offsetHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        element.style.top = newTop + 'px';
        element.style.left = newLeft + 'px';
    }
    
    function closeDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
        if (moved) saveState();
    }
}

function makeResizable(handle, element) {
    handle.addEventListener('mousedown', initResize);
    
    function initResize(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = element.offsetWidth;
        const startHeight = element.offsetHeight;
        const startLeft = element.offsetLeft;
        const startTop = element.offsetTop;
        const position = handle.dataset.position;
        const container = element.parentElement;
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        function resize(e) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            
            if (position.includes('e')) {
                newWidth = Math.max(100, Math.min(startWidth + deltaX, container.offsetWidth - startLeft));
            }
            if (position.includes('w')) {
                const delta = Math.min(deltaX, startLeft);
                newWidth = Math.max(100, startWidth - delta);
                newLeft = startLeft + (startWidth - newWidth);
            }
            if (position.includes('s')) {
                newHeight = Math.max(40, Math.min(startHeight + deltaY, container.offsetHeight - startTop));
            }
            if (position.includes('n')) {
                const delta = Math.min(deltaY, startTop);
                newHeight = Math.max(40, startHeight - delta);
                newTop = startTop + (startHeight - newHeight);
            }
            
            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            saveState();
        }
    }
}

// ===== SELECTION =====
function selectElement(element) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = element;
    element.classList.add('selected');
    
    const fontSize = parseInt(element.style.fontSize) || 14;
    const fontFamily = element.style.fontFamily.replace(/['"]/g, '') || 'Arial';
    document.getElementById('fontSize').value = fontSize;
    document.getElementById('fontSelect').value = fontFamily;
    
    updateFormatButtons();
}

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.text-box') && !e.target.closest('.toolbar') && !e.target.closest('.modal') && selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement = null;
        updateFormatButtons();
    }
});

// ===== PAGE MANAGEMENT =====
function addNewPage() {
    pageCount++;
    const current = document.querySelector(`.page[data-page="${currentActivePage}"]`);
    
    const newPage = document.createElement('div');
    newPage.className = 'page';
    newPage.dataset.page = pageCount;
    newPage.dataset.color = current.dataset.color;
    newPage.dataset.size = current.dataset.size;
    
    const content = document.createElement('div');
    content.className = 'page-content';
    content.id = 'page' + pageCount;
    newPage.appendChild(content);
    
    if (current.nextSibling) {
        document.getElementById('pagesContainer').insertBefore(newPage, current.nextSibling);
    } else {
        document.getElementById('pagesContainer').appendChild(newPage);
    }
    
    renumberPages();
    if (window.pageObserver) window.pageObserver.observe(newPage);
    
    setTimeout(() => newPage.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    saveState();
}

function renumberPages() {
    document.querySelectorAll('.page').forEach((page, i) => {
        page.dataset.page = i + 1;
        page.querySelector('.page-content').id = 'page' + (i + 1);
    });
    pageCount = document.querySelectorAll('.page').length;
    updatePageIndicator();
}

// ===== FORMATTING =====
function updateFont() {
    currentFont = document.getElementById('fontSelect').value;
    if (selectedElement) {
        selectedElement.style.fontFamily = currentFont;
        saveState();
    }
}

function updateFontSize() {
    currentFontSize = document.getElementById('fontSize').value;
    if (selectedElement) {
        selectedElement.style.fontSize = currentFontSize + 'px';
        saveState();
    }
}

function toggleBold() {
    if (!selectedElement) return;
    selectedElement.style.fontWeight = selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold';
    updateFormatButtons();
    saveState();
}

function toggleItalic() {
    if (!selectedElement) return;
    selectedElement.style.fontStyle = selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic';
    updateFormatButtons();
    saveState();
}

function toggleUnderline() {
    if (!selectedElement) return;
    selectedElement.style.textDecoration = selectedElement.style.textDecoration === 'underline' ? 'none' : 'underline';
    updateFormatButtons();
    saveState();
}

function setAlignment(align) {
    if (!selectedElement) return;
    selectedElement.style.textAlign = align;
    saveState();
}

function updateFormatButtons() {
    document.getElementById('boldBtn').classList.toggle('active', selectedElement?.style.fontWeight === 'bold');
    document.getElementById('italicBtn').classList.toggle('active', selectedElement?.style.fontStyle === 'italic');
    document.getElementById('underlineBtn').classList.toggle('active', selectedElement?.style.textDecoration === 'underline');
}

// ===== PAGE SETTINGS =====
function openPageSettingsModal() {
    const modal = document.getElementById('pageSettingsModal');
    const selector = document.getElementById('pageSelector');
    selector.innerHTML = '';
    
    document.querySelectorAll('.page').forEach((page, i) => {
        const btn = document.createElement('button');
        btn.textContent = `Seite ${i + 1}`;
        btn.onclick = () => {
            selectedPageForSettings = i + 1;
            selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        if (i + 1 === currentActivePage) btn.classList.add('active');
        selector.appendChild(btn);
    });
    
    selectedPageForSettings = currentActivePage;
    modal.classList.add('active');
}

function closePageSettingsModal() {
    document.getElementById('pageSettingsModal').classList.remove('active');
}

function setPaperColor(color) {
    const page = document.querySelector(`.page[data-page="${selectedPageForSettings}"]`);
    if (page) {
        page.dataset.color = color;
        page.querySelectorAll('.text-box').forEach(box => box.dataset.paper = color);
        saveState();
    }
}

function setPageSize(size) {
    const page = document.querySelector(`.page[data-page="${selectedPageForSettings}"]`);
    if (page) {
        page.dataset.size = size;
        const content = page.querySelector('.page-content');
        content.querySelectorAll('.text-box').forEach(box => {
            const maxLeft = content.offsetWidth - box.offsetWidth;
            const maxTop = content.offsetHeight - box.offsetHeight;
            if (box.offsetLeft > maxLeft) box.style.left = Math.max(0, maxLeft) + 'px';
            if (box.offsetTop > maxTop) box.style.top = Math.max(0, maxTop) + 'px';
        });
        saveState();
    }
}

// ===== HISTORY SYSTEM - FIXED =====
function captureState() {
    const pages = [];
    
    document.querySelectorAll('.page').forEach(page => {
        const pageData = {
            number: page.dataset.page,
            color: page.dataset.color,
            size: page.dataset.size,
            textBoxes: []
        };
        
        page.querySelectorAll('.text-box').forEach(box => {
            const textarea = box.querySelector('textarea');
            pageData.textBoxes.push({
                id: box.dataset.id,
                content: textarea.value, // WICHTIG: Expliziter Wert
                left: box.style.left,
                top: box.style.top,
                width: box.style.width,
                height: box.style.height,
                fontFamily: box.style.fontFamily,
                fontSize: box.style.fontSize,
                fontWeight: box.style.fontWeight,
                fontStyle: box.style.fontStyle,
                textDecoration: box.style.textDecoration,
                textAlign: box.style.textAlign,
                paper: box.dataset.paper
            });
        });
        
        pages.push(pageData);
    });
    
    return {
        pages: pages,
        pageCount: pageCount,
        activePage: currentActivePage
    };
}

function saveState() {
    if (isRestoring) return;
    
    const state = captureState();
    
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    history.push(state);
    if (history.length > MAX_HISTORY) {
        history.shift();
    } else {
        historyIndex++;
    }
    
    updateHistoryButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
    }
}

function restoreState(state) {
    isRestoring = true;
    
    const container = document.getElementById('pagesContainer');
    container.innerHTML = '';
    
    // Rebuild pages from state
    state.pages.forEach(pageData => {
        const page = document.createElement('div');
        page.className = 'page';
        page.dataset.page = pageData.number;
        page.dataset.color = pageData.color;
        page.dataset.size = pageData.size;
        
        const content = document.createElement('div');
        content.className = 'page-content';
        content.id = 'page' + pageData.number;
        
        // Rebuild textboxes
        pageData.textBoxes.forEach(boxData => {
            const textBox = createTextBox(pageData.color, boxData);
            content.appendChild(textBox);
        });
        
        page.appendChild(content);
        container.appendChild(page);
    });
    
    pageCount = state.pageCount;
    currentActivePage = state.activePage;
    selectedElement = null;
    
    // Re-setup observer
    if (window.pageObserver) window.pageObserver.disconnect();
    setupIntersectionObserver();
    
    updateHistoryButtons();
    updatePageIndicator();
    updateFormatButtons();
    
    setTimeout(() => isRestoring = false, 100);
}

function updateHistoryButtons() {
    document.getElementById('undoBtn').disabled = historyIndex <= 0;
    document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

// ===== PDF EXPORT - FIXED =====
async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const pages = document.querySelectorAll('.page');
    if (pages.length === 0) return;
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Erstelle PDF...';
    btn.disabled = true;
    
    try {
        const firstPageSize = pages[0].dataset.size || 'a4';
        let format = firstPageSize === 'a3' ? 'a3' : firstPageSize === 'letter' ? 'letter' : firstPageSize === 'legal' ? 'legal' : 'a4';
        const pdf = new jsPDF('p', 'mm', format);
        
        for (let i = 0; i < pages.length; i++) {
            if (i > 0) {
                const size = pages[i].dataset.size || 'a4';
                const fmt = size === 'a3' ? 'a3' : size === 'letter' ? 'letter' : size === 'legal' ? 'legal' : 'a4';
                pdf.addPage(fmt, 'p');
            }
            
            const page = pages[i];
            const bgColor = page.dataset.color === 'black' ? '#000000' : '#ffffff';
            
            // Create clean clone for PDF
            const clone = page.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            
            // Remove UI elements and convert textareas to divs
            clone.querySelectorAll('.text-box').forEach(box => {
                box.classList.remove('selected');
                
                // Remove handles and buttons
                box.querySelectorAll('.resize-handle, .delete-btn').forEach(el => el.remove());
                
                // Convert textarea to div for perfect rendering
                const textarea = box.querySelector('textarea');
                if (textarea) {
                    const div = document.createElement('div');
                    div.textContent = textarea.value;
                    div.style.width = '100%';
                    div.style.height = '100%';
                    div.style.padding = '8px';
                    div.style.fontFamily = box.style.fontFamily;
                    div.style.fontSize = box.style.fontSize;
                    div.style.fontWeight = box.style.fontWeight;
                    div.style.fontStyle = box.style.fontStyle;
                    div.style.textDecoration = box.style.textDecoration;
                    div.style.textAlign = box.style.textAlign;
                    div.style.lineHeight = '1.5';
                    div.style.whiteSpace = 'pre-wrap';
                    div.style.wordWrap = 'break-word';
                    div.style.overflow = 'visible';
                    div.style.color = box.dataset.paper === 'black' ? 'white' : 'black';
                    textarea.replaceWith(div);
                }
                
                // Clean box styling
                box.style.border = 'none';
                box.style.background = 'transparent';
                box.style.boxShadow = 'none';
            });
            
            clone.classList.remove('active-page');
            document.body.appendChild(clone);
            
            // Render with html2canvas
            const canvas = await html2canvas(clone, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: bgColor,
                width: page.offsetWidth,
                height: page.offsetHeight
            });
            
            document.body.removeChild(clone);
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
        }
        
        pdf.save(`document_${Date.now()}.pdf`);
    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('Fehler beim Erstellen der PDF. Bitte versuchen Sie es erneut.');
    }
    
    btn.textContent = originalText;
    btn.disabled = false;
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    const typing = document.activeElement.tagName === 'TEXTAREA';
    
    if (e.key === 'Delete' && selectedElement && !typing) {
        selectedElement.remove();
        selectedElement = null;
        saveState();
    }
    
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        else if (e.key === 'y') { e.preventDefault(); redo(); }
        else if (e.key === 'b' && !typing) { e.preventDefault(); toggleBold(); }
        else if (e.key === 'i' && !typing) { e.preventDefault(); toggleItalic(); }
        else if (e.key === 'u' && !typing) { e.preventDefault(); toggleUnderline(); }
        else if (e.key === 's') { e.preventDefault(); downloadPDF(); }
        else if (e.key === 't') { e.preventDefault(); addTextBox(); }
        else if (e.key === 'n') { e.preventDefault(); addNewPage(); }
    }
});