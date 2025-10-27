document.addEventListener('DOMContentLoaded', () => {
    // 取得 HTML 元素 (與前一版相同)
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const score1El = document.getElementById('score1'); // 這些其實可以被重新綁定，但為了一致性保留
    const score2El = document.getElementById('score2');
    const player1ScoreBox = document.getElementById('player1-score');
    const player2ScoreBox = document.getElementById('player2-score');
    const gameOverMessage = document.getElementById('game-over-message');
    const winnerText = document.getElementById('winner-text');
    const confirmLineButton = document.getElementById('confirm-line-button');
    const cancelLineButton = document.getElementById('cancel-line-button');
    const actionBar = document.getElementById('action-bar');
    
    const reset2PButton = document.getElementById('reset-2p-button');
    const resetAIButton = document.getElementById('reset-ai-button');

    // 遊戲設定 (與前一版相同)
    const GRID_SIZE = 4;
    const DOT_SPACING = 100;
    const PADDING = 50;
    const DOT_RADIUS = 6;
    const LINE_WIDTH = 4;
    const CLICK_TOLERANCE_DOT = 15;

    // 玩家顏色 (與前一版相同)
    const PLAYER_COLORS = {
        1: { line: '#3498db', fill: 'rgba(52, 152, 219, 0.3)' },
        2: { line: '#e74c3c', fill: 'rgba(231, 76, 60, 0.3)' },
    };
    const DEFAULT_LINE_COLOR = '#e0e0e0';

    // 遊戲狀態 (與前一版相同)
    let gameMode = '2P';
    let isGameOver = false;
    let currentPlayer = 1;
    let scores = { 1: 0, 2: 0 };
    let dots = [];
    let lines = {};
    let squares = [];
    let totalSquares = (GRID_SIZE - 1) * (GRID_SIZE - 1);
    
    let selectedDot1 = null;
    let selectedDot2 = null;

    // 初始化遊戲 (與前一版相同)
    function initGame(mode) {
        gameMode = mode;
        isGameOver = false;
        
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

        const player2Name = (gameMode === 'AI') ? '電腦' : '玩家 2';
        player2ScoreBox.innerHTML = `${player2Name}: <span id="score2">0</span>`;

        // 1. 產生點
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

        // 2. 產生線 (H 和 V)
        lines = {};
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (c < GRID_SIZE - 1) {
                    const id = `H_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r][c + 1], drawn: false, player: null, id: id };
                }
                if (r < GRID_SIZE - 1) {
                    const id = `V_${r},${c}`;
                    lines[id] = { p1: dots[r][c], p2: dots[r + 1][c], drawn: false, player: null, id: id };
                }
            }
        }

        // 3. 產生正方形
        squares = [];
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                const h1 = `H_${r},${c}`;   const h2 = `H_${r + 1},${c}`;
                const v1 = `V_${r},${c}`;   const v2 = `V_${r},${c + 1}`;
                squares.push({
                    lineKeys: [h1, h2, v1, v2],
                    x: dots[r][c].x, y: dots[r][c].y, size: DOT_SPACING,
                    filled: false, player: null
                });
            }
        }
        totalSquares = squares.length;
        
        updateUI();
        drawCanvas();
        enableCanvasClick(); // 確保畫布可以點擊
    }

    // 繪製畫布 (與前一版相同)
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. 繪製正方形
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
        
        // 2. 繪製線條
        for (const id in lines) {
            const line = lines[id];
            ctx.beginPath();
            ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p2.x, line.p2.y);
            if (line.drawn) {
                ctx.strokeStyle = PLAYER_COLORS[line.player].line;
                ctx.lineWidth = LINE_WIDTH;
            } else {
                ctx.strokeStyle = DEFAULT_LINE_COLOR;
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 3. 繪製點
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                ctx.beginPath();
                ctx.arc(dots[r][c].x, dots[r][c].y, DOT_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = '#34495e';
                ctx.fill();
            }
        }
        
        // 4. 高亮選中的點
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

    // 點擊/觸控畫布 (與前一版相同)
    function handleCanvasClick(e) {
        if (!actionBar.classList.contains('hidden') || isGameOver) {
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX; clientY = e.clientY;
        }
        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;
        const clickedDot = findNearestDot(mouseX, mouseY);
        if (!clickedDot) {
            if (selectedDot1) { cancelLine(); }
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

    // "確認連線" 按鈕的函式 (與前一版相同)
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
        const conflict = segments.some(seg => seg.drawn && seg.player !== currentPlayer);
        if (conflict) {
            alert("路徑被對手阻擋！");
            cancelLine();
            return;
        }
        const newSegmentsDrawn = segments.filter(seg => !seg.drawn);
        if (newSegmentsDrawn.length === 0) {
            alert("這條線您已經畫過了。");
            cancelLine();
            return;
        }

        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        
        processMove(newSegmentsDrawn); // 呼叫核心處理函式
    }
    
    // 核心遊戲邏輯 (人類和 AI 共用)
    function processMove(segments) {
        if (isGameOver) return;

        // 1. 畫線
        segments.forEach(seg => {
            seg.drawn = true;
            seg.player = currentPlayer;
        });

        // 2. 檢查得分 (經典點格棋規則)
        let totalFilledSquares = 0;
        squares.forEach(sq => {
            if (!sq.filled) {
                const isComplete = sq.lineKeys.every(key => lines[key] && lines[key].drawn);
                if (isComplete) {
                    sq.filled = true;
                    sq.player = currentPlayer;
                    scores[currentPlayer]++;
                }
            }
            if (sq.filled) totalFilledSquares++;
        });

        // 3. 更新畫布和 UI
        drawCanvas();
        updateUI();

        // 4. 檢查遊戲結束
        if (totalFilledSquares === totalSquares) {
            endGame();
            return;
        }

        // 5. 無論是否得分，都換人
        switchPlayer();
    }

    // 電腦 AI 邏輯 (與前一版相同，因為 AI 策略不變)
    function computerTakeTurn() {
        if (isGameOver) return;

        const possibleMoves = Object.values(lines).filter(line => !line.drawn);
        let scoringMoves = [];
        let safeMoves = [];
        let badMoves = [];

        for (const line of possibleMoves) {
            let completesBox = false;
            let createsSetup = false;
            
            const affectedSquares = getSquaresForLine(line.id);

            for (const sq of affectedSquares) {
                if (sq.filled) continue;
                
                const sides = countDrawnSides(sq);
                if (sides === 3) {
                    completesBox = true;
                    break;
                }
                if (sides === 2) {
                    createsSetup = true;
                }
            }

            if (completesBox) {
                scoringMoves.push(line);
            } else if (createsSetup) {
                badMoves.push(line);
            } else {
                safeMoves.push(line);
            }
        }

        let chosenLine;
        if (scoringMoves.length > 0) {
            chosenLine = scoringMoves[0];
        } else if (safeMoves.length > 0) {
            chosenLine = safeMoves[Math.floor(Math.random() * safeMoves.length)];
        } else {
            chosenLine = badMoves[Math.floor(Math.random() * badMoves.length)];
        }

        // AI 畫一條線 (AI 一次只畫一個線段)
        processMove([chosenLine]);
    }


    // "取消選取" 按鈕的函式 (與前一版相同)
    function cancelLine() {
        selectedDot1 = null;
        selectedDot2 = null;
        actionBar.classList.add('hidden');
        drawCanvas();
    }


    // ----- 輔助函式 -----

    // 輔助函式 - 找到最近的點 (與前一版相同)
    function findNearestDot(mouseX, mouseY) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const dot = dots[r][c];
                const distSq = (mouseX - dot.x) ** 2 + (mouseY - dot.y) ** 2;
                if (distSq < CLICK_TOLERANCE_DOT ** 2) { return dot; }
            }
        }
        return null;
    }

    // 輔助函式 - 檢查是否為 H 或 V (與前一版相同)
    function isValidLine(dotA, dotB) {
        const dr = Math.abs(dotA.r - dotB.r);
        const dc = Math.abs(dotA.c - dotB.c);
        return dr === 0 || dc === 0; // 只能 橫 (dr=0) 或 直 (dc=0)
    }

    // 【修改】輔助函式 - 取得長線上的所有小線段 (處理多格連線)
    function getSegmentsForLine(dotA, dotB) {
        const segments = [];
        const dr = Math.sign(dotB.r - dotA.r); // 行方向 (-1, 0, 1)
        const dc = Math.sign(dotB.c - dotA.c); // 列方向 (-1, 0, 1)
        let r = dotA.r;
        let c = dotA.c;
        
        // 確保是直線或橫線 (排除斜線)
        if (dr !== 0 && dc !== 0) { return []; } 

        // 遍歷所有中間的點，找到對應的線段
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
                // 如果找不到線段，表示路徑無效，直接返回空
                console.warn("找不到線段 ID (或路徑無效):", segmentId, "在點", r, c, "到", next_r, next_c);
                return []; 
            }
            r = next_r;
            c = next_c;
        }
        return segments;
    }

    // 輔助函式: 取得一條線所屬的方塊 (1 或 2 個) (與前一版相同)
    function getSquaresForLine(lineID) {
        return squares.filter(sq => sq.lineKeys.includes(lineID));
    }

    // 輔助函式: 計算一個方塊有幾條邊被畫了 (與前一版相同)
    function countDrawnSides(square) {
        let count = 0;
        for (const key of square.lineKeys) {
            if (lines[key] && lines[key].drawn) {
                count++;
            }
        }
        return count;
    }

    // 輔助函式: 鎖定/解鎖畫布 (與前一版相同)
    function disableCanvasClick() {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'wait';
    }
    function enableCanvasClick() {
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'pointer';
    }

    // 切換玩家 (現在每次都會換人) (與前一版相同)
    function switchPlayer() {
        if (isGameOver) return;
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        updateUI();
        
        if (gameMode === 'AI' && currentPlayer === 2) {
            disableCanvasClick();
            actionBar.classList.add('hidden');
            setTimeout(computerTakeTurn, 1000);
        } else {
            enableCanvasClick();
        }
    }

    // 更新 UI (分數和玩家高亮) (與前一版相同)
    function updateUI() {
        const score1Span = document.getElementById('score1');
        const score2Span = document.getElementById('score2');
        if (score1Span) score1Span.textContent = scores[1];
        if (score2Span) score2Span.textContent = scores[2];
        
        if (currentPlayer === 1) {
            player1ScoreBox.classList.add('active');
            player2ScoreBox.classList.remove('active', 'player2');
        } else {
            player1ScoreBox.classList.remove('active');
            player2ScoreBox.classList.add('active', 'player2');
        }
    }

    // 遊戲結束 (與前一版相同)
    function endGame() {
        isGameOver = true;
        disableCanvasClick();

        let winnerMessage = "";
        if (scores[1] > scores[2]) {
            winnerMessage = "玩家 1 獲勝！";
        } else if (scores[2] > scores[1]) {
            winnerMessage = (gameMode === 'AI') ? "電腦獲勝！" : "玩家 2 獲勝！";
        } else {
            winnerMessage = "平手！";
        }
        winnerText.textContent = winnerMessage;
        gameOverMessage.classList.remove('hidden');
        actionBar.classList.add('hidden');
    }

    // 綁定所有事件 (與前一版相同)
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleCanvasClick(e);
    });
    
    reset2PButton.addEventListener('click', () => initGame('2P'));
    resetAIButton.addEventListener('click', () => initGame('AI'));
    
    confirmLineButton.addEventListener('click', confirmLine);
    cancelLineButton.addEventListener('click', cancelLine);

    // 啟動遊戲 (預設為 2P 模式)
    initGame('2P');
});