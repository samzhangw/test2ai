document.addEventListener('DOMContentLoaded', () => {
    // 取得 HTML 元素 (相同)
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const score1El = document.getElementById('score1');
    const score2El = document.getElementById('score2');
    const player1ScoreBox = document.getElementById('player1-score');
    const player2ScoreBox = document.getElementById('player2-score');
    const gameOverMessage = document.getElementById('game-over-message');
    const winnerText = document.getElementById('winner-text');
    const confirmLineButton = document.getElementById('confirm-line-button');
    const cancelLineButton = document.getElementById('cancel-line-button');
    const actionBar = document.getElementById('action-bar');
    const resetButton = document.getElementById('reset-button');

    // 遊戲設定
    const GRID_SIZE = 4;
    const DOT_SPACING = 100;
    const PADDING = 50;
    const DOT_RADIUS = 6;
    // --- 【修改 1】 ---
    const LINE_WIDTH = 8; // (原: 4) 總寬度
    const CLICK_TOLERANCE_DOT = 15;

    // 玩家顏色 (相同)
    const PLAYER_COLORS = {
        1: { line: '#3498db', fill: 'rgba(52, 152, 219, 0.3)' },
        2: { line: '#e74c3c', fill: 'rgba(231, 76, 60, 0.3)' },
    };
    // --- 【修改 2】 ---
    const DEFAULT_LINE_COLOR = '#bbbbbb'; // (原: #e0e0e0)

    // 遊戲狀態 (相同)
    let currentPlayer = 1;
    let scores = { 1: 0, 2: 0 };
    let dots = [];
    let lines = {};
    let squares = [];
    let totalSquares = (GRID_SIZE - 1) * (GRID_SIZE - 1);
    
    let selectedDot1 = null;
    let selectedDot2 = null;

    // 初始化遊戲 (相同)
    function initGame() {
        const canvasSize = (GRID_SIZE - 1) * DOT_SPACING + PADDING * 2;
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        currentPlayer = 1;
        scores = { 1: 0, 2: 0 };
        dots = [];
        lines = {};
        squares = [];
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        gameOverMessage.classList.add('hidden');

        // 1. 產生點 (相同)
        for (let r = 0; r < GRID_SIZE; r++) {
            dots[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                dots[r][c] = {
                    x: c * DOT_SPACING + PADDING,
                    y: r * DOT_SPACING + PADDING,
                    r: r, c: c
                };
            }
        }

        // 2. 產生線段 (相同)
        lines = {};
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (c < GRID_SIZE - 1) {
                    const id = `H_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r][c + 1], players: [], id: id };
                }
                if (r < GRID_SIZE - 1) {
                    const id = `V_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c], players: [], id: id };
                }
            }
        }

        // 3. 產生正方形 (相同)
        squares = [];
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                const h1 = `H_${r},${c}`;   // 上
                const h2 = `H_${r + 1},${c}`; // 下
                const v1 = `V_${r},${c}`;   // 左
                const v2 = `V_${r},${c + 1}`; // 右
                squares.push({
                    lineKeys: [h1, h2, v1, v2],
                    x: dots[r][c].x,
                    y: dots[r][c].y,
                    size: DOT_SPACING,
                    filled: false, 
                    player: null
                });
            }
        }
        totalSquares = squares.length;
        
        updateUI();
        drawCanvas();
    }

    // 繪製所有遊戲元素
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製已完成的正方形 (填色) (相同)
        squares.forEach(sq => {
            if (sq.filled) {
                ctx.fillStyle = PLAYER_COLORS[sq.player].fill;
                ctx.fillRect(sq.x, sq.y, sq.size, sq.size);
                
                ctx.fillStyle = PLAYER_COLORS[sq.player].line;
                ctx.font = 'bold 48px var(--font-main, sans-serif)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(sq.player, sq.x + sq.size / 2, sq.y + sq.size / 2 + 5); 
            }
        });

        // 2. 繪製所有線條 (H 和 V)
        for (const id in lines) {
            const line = lines[id];
            
            const hasP1 = line.players.includes(1);
            const hasP2 = line.players.includes(2);

            if (!hasP1 && !hasP2) {
                // --- 1. 虛線 (未畫) ---
                ctx.beginPath();
                ctx.moveTo(line.p1.x, line.p1.y);
                ctx.lineTo(line.p2.x, line.p2.y);
                ctx.strokeStyle = DEFAULT_LINE_COLOR;
                // --- 【修改 3】 ---
                ctx.lineWidth = 2; // (原: 1)
                ctx.setLineDash([2, 4]);
                ctx.stroke();

            } else if (hasP1 && !hasP2) {
                // --- 2. 只有 P1 (全寬) ---
                ctx.beginPath();
                ctx.moveTo(line.p1.x, line.p1.y);
                ctx.lineTo(line.p2.x, line.p2.y);
                ctx.strokeStyle = PLAYER_COLORS[1].line;
                ctx.lineWidth = LINE_WIDTH;
                ctx.stroke();
                
            } else if (!hasP1 && hasP2) {
                // --- 3. 只有 P2 (全寬) ---
                ctx.beginPath();
                ctx.moveTo(line.p1.x, line.p1.y);
                ctx.lineTo(line.p2.x, line.p2.y);
                ctx.strokeStyle = PLAYER_COLORS[2].line;
                ctx.lineWidth = LINE_WIDTH;
                ctx.stroke();

            } else if (hasP1 && hasP2) {
                // --- 4. 重疊 (P1 和 P2 都有) ---
                
                let dx = line.p2.x - line.p1.x;
                let dy = line.p2.y - line.p1.y;
                const len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); 
                const norm_x = -dy / len;
                const norm_y = dx / len;

                // (LINE_WIDTH 已在上方修改為 8)
                const offsetX = norm_x * (LINE_WIDTH / 4); // 偏移 2px
                const offsetY = norm_y * (LINE_WIDTH / 4); // 偏移 2px
                const halfWidth = LINE_WIDTH / 2; // 半寬 4px

                // 繪製 玩家 1 (偏移 -)
                ctx.beginPath();
                ctx.moveTo(line.p1.x - offsetX, line.p1.y - offsetY);
                ctx.lineTo(line.p2.x - offsetX, line.p2.y - offsetY);
                ctx.strokeStyle = PLAYER_COLORS[1].line;
                ctx.lineWidth = halfWidth;
                ctx.stroke();

                // 繪製 玩家 2 (偏移 +)
                ctx.beginPath();
                ctx.moveTo(line.p1.x + offsetX, line.p1.y + offsetY);
                ctx.lineTo(line.p2.x + offsetX, line.p2.y + offsetY);
                ctx.strokeStyle = PLAYER_COLORS[2].line;
                ctx.lineWidth = halfWidth;
                ctx.stroke();
            }
            ctx.setLineDash([]); 
        }

        // 3. 繪製所有的點 (相同)
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                ctx.beginPath();
                ctx.arc(dots[r][c].x, dots[r][c].y, DOT_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = '#34495e';
                ctx.fill();
            }
        }
        
        // 4. 高亮顯示被選中的點 (相同)
        [selectedDot1, selectedDot2].forEach(dot => {
            if (dot) {
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_RADIUS + 3, 0, 2 * Math.PI);
                ctx.strokeStyle = PLAYER_COLORS[currentPlayer].line;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        });
    }

    // 點擊/觸控畫布 (相同)
    function handleCanvasClick(e) {
        if (!actionBar.classList.contains('hidden')) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;
        const clickedDot = findNearestDot(mouseX, mouseY);
        if (!clickedDot) {
            if (selectedDot1) {
                cancelLine();
            }
            return;
        }
        if (selectedDot1 === null) {
            selectedDot1 = clickedDot;
        } else if (selectedDot2 === null) {
            if (clickedDot === selectedDot1) {
                selectedDot1 = null;
            } else {
                selectedDot2 = clickedDot;
                actionBar.classList.remove('hidden');
            }
        }
        drawCanvas();
    }

    // "確認連線" 按鈕的函式 (相同)
    function confirmLine() {
        if (!selectedDot1 || !selectedDot2) return;
        const dotA = selectedDot1;
        const dotB = selectedDot2;

        if (!isValidLine(dotA, dotB)) {
            alert("無效的線條 (只能畫橫線或直線)");
            cancelLine();
            return;
        }

        const segments = getSegmentsForLine(dotA, dotB);
        if (segments.length === 0) {
            alert("無效的路徑");
            cancelLine();
            return;
        }

        const newSegments = segments.filter(seg => seg.players.length === 0);
        
        if (newSegments.length === 0) {
            const alreadyDrawnBySelf = segments.every(seg => seg.players.includes(currentPlayer));
            if (alreadyDrawnBySelf) {
                 alert("這條線您已經畫過了。");
            } else {
                 alert("這條線必須包含至少一段*全新*的線段。");
            }
            cancelLine();
            return;
        }

        segments.forEach(seg => {
            if (!seg.players.includes(currentPlayer)) {
                seg.players.push(currentPlayer);
            }
        });
        
        let scoredThisTurn = false; 
        let totalFilledSquares = 0;
        
        squares.forEach(sq => {
            if (!sq.filled) {
                const isComplete = sq.lineKeys.every(key => lines[key] && lines[key].players.length > 0);
                
                if (isComplete) {
                    sq.filled = true;
                    sq.player = currentPlayer;
                    scores[currentPlayer]++;
                    scoredThisTurn = true; 
                }
            }
            if (sq.filled) totalFilledSquares++;
        });

        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        
        drawCanvas();
        updateUI();

        if (totalFilledSquares === totalSquares) {
            endGame();
            return;
        }

        if (!scoredThisTurn) {
            switchPlayer();
        }
    }

    // "取消選取" 按鈕的函式 (相同)
    function cancelLine() {
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        drawCanvas();
    }


    // ----- 輔助函式 (以下皆相同) -----

    function findNearestDot(mouseX, mouseY) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const dot = dots[r][c];
                const distSq = (mouseX - dot.x) ** 2 + (mouseY - dot.y) ** 2;
                if (distSq < CLICK_TOLERANCE_DOT ** 2) {
                    return dot;
                }
            }
        }
        return null;
    }

function isValidLine(dotA, dotB) {
        const dr = Math.abs(dotA.r - dotB.r);
        const dc = Math.abs(dotA.c - dotB.c);
        return dr === 0 || dc === 0;
    }

    function getSegmentsForLine(dotA, dotB) {
        const segments = [];
        const dr = Math.sign(dotB.r - dotA.r);
        const dc = Math.sign(dotB.c - dotA.c);
        let r = dotA.r;
        let c = dotA.c;
        
        if (dr !== 0 && dc !== 0) {
            return []; 
        }

        while (r !== dotB.r || c !== dotB.c) {
            let next_r = r + dr;
            let next_c = c + dc;
            let segmentId = null;

            if (dr === 0) { // 橫線
                segmentId = `H_${r},${Math.min(c, next_c)}`;
            } else if (dc === 0) { // 直線
                segmentId = `V_${Math.min(r, next_r)},${c}`;
            }

            if (segmentId && lines[segmentId]) {
                segments.push(lines[segmentId]);
            } else {
                console.log("找不到線段 ID (或路徑無效):", segmentId);
            }
            r = next_r;
            c = next_c;
        }
        return segments;
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        updateUI();
    }

    function updateUI() {
        score1El.textContent = scores[1];
        score2El.textContent = scores[2];
        if (currentPlayer === 1) {
            player1ScoreBox.classList.add('active');
            player2ScoreBox.classList.remove('active', 'player2');
        } else {
            player1ScoreBox.classList.remove('active');
            player2ScoreBox.classList.add('active', 'player2');
        }
    }

    function endGame() {
        let winnerMessage = "";
        if (scores[1] > scores[2]) {
            winnerMessage = "玩家 1 獲勝！";
        } else if (scores[2] > scores[1]) {
            winnerMessage = "玩家 2 獲勝！";
        } else {
            winnerMessage = "平手！";
        }
        winnerText.textContent = winnerMessage;
        gameOverMessage.classList.remove('hidden');
        actionBar.classList.add('hidden');
    }

    // 綁定所有事件 (相同)
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleCanvasClick(e);
    });
    resetButton.addEventListener('click', initGame);
    confirmLineButton.addEventListener('click', confirmLine);
    cancelLineButton.addEventListener('click', cancelLine);

    // 啟動遊戲
    initGame();
});