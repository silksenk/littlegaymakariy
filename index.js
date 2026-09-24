const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const audio = document.getElementById('bgAudio');

let isDrawing = false; 
let lastSplatterTime = 0; 
let drawingOpacity = 1.0; 
let isClearing = false;
let splatters = []; 
const splatterInterval = 40; 

const images = ['zov.jpg', 'zov1.jpg', 'zov2.jpg', 'zov3.jpg']; 
let currentImgIndex = 0; 

const img = new Image();

function drawBaseImage() {
    if (img.complete && img.naturalWidth !== 0) {
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        const imgRatio = imgWidth / imgHeight;
        const canvasRatio = canvasWidth / canvasHeight;

        let srcX = 0, srcY = 0, srcWidth = imgWidth, srcHeight = imgHeight;

        if (imgRatio > canvasRatio) {
            srcWidth = imgHeight * canvasRatio;
            srcX = (imgWidth - srcWidth) / 2;
        } else {
            srcHeight = imgWidth / canvasRatio;
            srcY = (imgHeight - srcHeight) / 2;
        }

        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, canvasWidth, canvasHeight);
    }
}

function loadCanvasImage() {
    isClearing = false;      
    drawingOpacity = 1.0;     
    splatters = [];           
    img.src = images[currentImgIndex];
}

img.onload = function() {
    render();
};
loadCanvasImage();

prevBtn.addEventListener('click', function() {
    currentImgIndex--;
    if (currentImgIndex < 0) currentImgIndex = images.length - 1;
    loadCanvasImage();
});

nextBtn.addEventListener('click', function() {
    currentImgIndex++;
    if (currentImgIndex >= images.length) currentImgIndex = 0;
    loadCanvasImage();
});

clearBtn.addEventListener('click', function() {
    if (isClearing || splatters.length === 0) return;
    isClearing = true;

    const startTime = Date.now();
    const duration = 4000; 

    function fadeOut() {
        const elapsed = Date.now() - startTime;
        drawingOpacity = 1.0 - (elapsed / duration);

        if (drawingOpacity <= 0) {
            drawingOpacity = 1.0;
            splatters = []; 
            isClearing = false; 
            render();
        } else {
            render();
            requestAnimationFrame(fadeOut); 
        }
    }
    requestAnimationFrame(fadeOut);
});

function generateBlobPoints(centerX, centerY, baseRadius, numPoints = 12) {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const randomRadius = baseRadius * (0.6 + Math.random() * 0.6);
        points.push({
            x: centerX + Math.cos(angle) * randomRadius,
            y: centerY + Math.sin(angle) * randomRadius
        });
    }
    return points;
}

function drawSavedBlob(points) {
    if (points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    drawBaseImage(); 

    ctx.save();
    ctx.globalAlpha = drawingOpacity;

    splatters.forEach(s => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        drawSavedBlob(s.mainBlobPoints);

        s.subBlobsData.forEach(sb => {
            drawSavedBlob(sb.points);
        });

        s.dropsData.forEach(d => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            
            if (d.type === 'line') {
                ctx.beginPath();
                ctx.lineWidth = d.dropRadius * 1.5;
                ctx.lineCap = 'round';
                ctx.moveTo(d.startX, d.startY);
                ctx.lineTo(d.endX, d.endY);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(d.endX, d.endY, d.dropRadius * 1.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (d.type === 'circle') {
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    });
    ctx.restore();
}
function addSplatter(x, y) {
    const baseRadius = Math.random() * 15 + 15;
    const mainBlobPoints = generateBlobPoints(x, y, baseRadius, 14);
    
    const subBlobsData = [];
    const numSubBlobs = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < numSubBlobs; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = baseRadius * (1.1 + Math.random() * 1.2);
        const bx = x + Math.cos(angle) * distance;
        const by = y + Math.sin(angle) * distance;
        const br = baseRadius * (0.15 + Math.random() * 0.25);
        subBlobsData.push({
            points: generateBlobPoints(bx, by, br, 8)
        });
    }

    const dropsData = [];
    const numDrops = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numDrops; i++) {
        const startX = x + (Math.random() * baseRadius - baseRadius / 2);
        const startY = y + (Math.random() * baseRadius * 0.5);
        const length = Math.random() * 40 + 20;
        const dropRadius = Math.random() * 2 + 1.5;

        dropsData.push({
            type: 'line',
            startX: startX,
            startY: startY,
            endX: startX,
            endY: startY + length,
            dropRadius: dropRadius
        });

        if (Math.random() > 0.4) {
            dropsData.push({
                type: 'circle',
                x: startX,
                y: startY + length + Math.random() * 20 + 10,
                r: dropRadius * (0.7 + Math.random() * 0.5)
            });
        }
    }

    splatters.push({ mainBlobPoints, subBlobsData, dropsData });
    render();
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height
    };
}

function handleStart(e) {
    if (isClearing) return;
    isDrawing = true;
    const coords = getCanvasCoordinates(e);
    addSplatter(coords.x, coords.y);
    lastSplatterTime = Date.now();

    if (audio && audio.paused) {
        audio.play().catch(err => console.log("Музыка заблокирована браузером:", err));
    }
}

function handleMove(e) {
    if (!isDrawing || isClearing) return;
    if (e.touches) e.preventDefault();
    
    const now = Date.now();
    if (now - lastSplatterTime > splatterInterval) {
        const coords = getCanvasCoordinates(e);
        addSplatter(coords.x, coords.y);
        lastSplatterTime = now;
    }
}

function handleEnd() {
    isDrawing = false;
}
function openToiletBackground(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const video = document.getElementById('toiletVideo');
    const audio = document.getElementById('bgAudio');
    const btn = document.getElementById('toiletBtn');
    
    const contentBlock = document.querySelector('.content');

    if (!video) {
        console.error("Тег видео <video id='toiletVideo'> не найден в HTML!");
        return;
    }

    video.classList.toggle('active');
    
    if (video.classList.contains('active')) {
        if (contentBlock) {
            contentBlock.style.setProperty('display', 'none', 'important');
        }
        
        if (audio && !audio.paused) audio.pause();
        
        video.muted = false;
        video.volume = 1.0;
        video.play().catch(err => {
            
            video.muted = true;
            video.play();
        });

        if (btn) {
            btn.textContent = "Выйти из туалета";
            btn.classList.add('inside');
        }
    } else {
        
        video.pause();
        video.currentTime = 0;
        
        if (contentBlock) {
            contentBlock.style.display = 'block'; 
        }
        
        if (audio && audio.paused) {
            audio.play().catch(() => {});
        }

        if (btn) {
            btn.textContent = "Войти в туалет \"Ауры\"";
            btn.classList.remove('inside');
        }
    }
}


function closeAiModal(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('aiDisclaimerModal');
    if (modal) modal.style.display = 'none';
}

canvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    if (isDrawing) {
        e.preventDefault(); 
    }
    handleMove(e);
}, { passive: false });

window.addEventListener('touchend', handleEnd);
