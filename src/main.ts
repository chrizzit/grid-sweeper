import './pwa';

interface Difficulty {
    w: number;
    h: number;
    m: number;
}

interface Cell {
    x: number;
    y: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
    element: HTMLDivElement;
}

interface Score {
    time: number;
    date: string;
}

let BOARD_WIDTH = 10;
let BOARD_HEIGHT = 10;
let MINES_COUNT = 10;
let currentDifficulty: keyof typeof DIFFICULTIES = 'beginner';

const DIFFICULTIES: Record<string, Difficulty> = {
    beginner: { w: 10, h: 10, m: 10 },
    intermediate: { w: 16, h: 16, m: 40 },
    expert: { w: 30, h: 16, m: 99 }
} as const;

let board: Cell[][] = [];
let mines: Cell[] = [];
let gameOver = false;
let firstClick = true;
let cellsRevealed = 0;
let uiTimer = 0;
let timerInterval: number | null = null;
let flagsPlaced = 0;
let flagModeActive = false;
let touchTimer: number | null = null;
let longPressTriggered = false;

const boardElement = document.getElementById('board') as HTMLDivElement;
const mineCountElement = document.getElementById('mine-count') as HTMLDivElement;
const timerElement = document.getElementById('timer') as HTMLDivElement;
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
const restartWrapper = document.getElementById('restart-wrapper') as HTMLDivElement;
const leaderboardListElement = document.getElementById('leaderboard-list') as HTMLOListElement;
const noScoresMsgElement = document.getElementById('no-scores-msg') as HTMLParagraphElement;

const FACES = {
    normal: '😊',
    win: '😎',
    lose: '😵',
    scared: '😮'
} as const;

function initGame(): void {
    board = [];
    mines = [];
    gameOver = false;
    firstClick = true;
    cellsRevealed = 0;
    uiTimer = 0;
    flagsPlaced = 0;
    
    if (timerInterval) clearInterval(timerInterval);
    timerElement.textContent = '000';
    updateMineCount();
    restartBtn.textContent = FACES.normal;
    
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 1fr)`;
    document.documentElement.style.setProperty('--board-width', BOARD_WIDTH.toString());
    document.documentElement.style.setProperty('--board-height', BOARD_HEIGHT.toString());
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cellElement = document.createElement('div');
            const cellData: Cell = {
                x, y,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                element: cellElement
            };
            
            cellData.element.classList.add('cell');
            cellData.element.dataset.x = x.toString();
            cellData.element.dataset.y = y.toString();
            
            cellData.element.addEventListener('mousedown', (e) => handleCellMouseDown(e, cellData));
            cellData.element.addEventListener('mouseup', (e) => handleCellMouseUp(e, cellData));
            cellData.element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(cellData);
            });
            cellData.element.addEventListener('mouseleave', () => {
                if (!gameOver) restartBtn.textContent = FACES.normal;
            });

            // Touch events for mobile support
            cellData.element.addEventListener('touchstart', (e) => handleCellTouchStart(e, cellData), { passive: false });
            cellData.element.addEventListener('touchend', (e) => handleCellTouchEnd(e, cellData));
            cellData.element.addEventListener('touchmove', () => {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                cellData.element.classList.remove('touch-active');
            });

            boardElement.appendChild(cellData.element);
            row.push(cellData);
        }
        board.push(row);
    }
}

function handleCellMouseDown(e: MouseEvent, cellData: Cell): void {
    if (gameOver || cellData.isRevealed || cellData.isFlagged || e.button !== 0) return;
    restartBtn.textContent = FACES.scared;
}

function handleCellMouseUp(e: MouseEvent, cellData: Cell): void {
    if (gameOver || cellData.isRevealed || cellData.isFlagged || e.button !== 0) return;
    restartBtn.textContent = FACES.normal;
    
    if (flagModeActive) {
        toggleFlag(cellData);
    } else {
        revealCell(cellData);
    }
}

function handleCellTouchStart(e: TouchEvent, cellData: Cell): void {
    if (gameOver || cellData.isRevealed) return;
    
    // Check if it's a single touch
    if (e.touches.length > 1) return;
    
    // Prevent default to avoid scrolling while long-pressing
    // Only if not revealed to allow scrolling elsewhere
    longPressTriggered = false;
    cellData.element.classList.add('touch-active');
    
    touchTimer = window.setTimeout(() => {
        toggleFlag(cellData);
        longPressTriggered = true;
        touchTimer = null;
        cellData.element.classList.remove('touch-active');
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
}

function handleCellTouchEnd(_e: TouchEvent, cellData: Cell): void {
    let wasActiveTouch = !!touchTimer;
    
    if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
    }
    cellData.element.classList.remove('touch-active');
    
    if (gameOver || cellData.isRevealed) return;
    
    if (!longPressTriggered && wasActiveTouch) {
        if (flagModeActive) {
            toggleFlag(cellData);
        } else {
            revealCell(cellData);
        }
    }
}

function placeMines(firstClickX: number, firstClickY: number): void {
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
        const x = Math.floor(Math.random() * BOARD_WIDTH);
        const y = Math.floor(Math.random() * BOARD_HEIGHT);
        
        const isSafeZone = Math.abs(x - firstClickX) <= 1 && Math.abs(y - firstClickY) <= 1;
        
        if (!board[y][x].isMine && !isSafeZone) {
            board[y][x].isMine = true;
            mines.push(board[y][x]);
            minesPlaced++;
        }
    }
    calculateNeighbors();
}

function calculateNeighbors(): void {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x].isMine) continue;
            let count = 0;
            getNeighbors(x, y).forEach(n => {
                if (n.isMine) count++;
            });
            board[y][x].neighborMines = count;
        }
    }
}

function getNeighbors(x: number, y: number): Cell[] {
    const neighbors: Cell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                neighbors.push(board[ny][nx]);
            }
        }
    }
    return neighbors;
}

function toggleFlag(cellData: Cell): void {
    if (gameOver || cellData.isRevealed) return;
    
    if (cellData.isFlagged) {
        cellData.isFlagged = false;
        cellData.element.classList.remove('flagged');
        flagsPlaced--;
    } else {
        if (flagsPlaced < MINES_COUNT) {
            cellData.isFlagged = true;
            cellData.element.classList.add('flagged');
            flagsPlaced++;
        }
    }
    updateMineCount();
}

function updateMineCount(): void {
    const remaining = MINES_COUNT - flagsPlaced;
    const isNegative = remaining < 0;
    const absRemaining = Math.abs(remaining);
    const prefix = isNegative ? '-' : '0';
    mineCountElement.textContent = prefix + absRemaining.toString().padStart(2, '0');
}

function startTimer(): void {
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
        uiTimer++;
        if (uiTimer > 999) uiTimer = 999;
        timerElement.textContent = uiTimer.toString().padStart(3, '0');
    }, 1000);
}

function revealCell(cellData: Cell): void {
    if (gameOver || cellData.isRevealed || cellData.isFlagged) return;

    if (firstClick) {
        firstClick = false;
        placeMines(cellData.x, cellData.y);
        startTimer();
    }

    if (cellData.isMine) {
        triggerGameOver(false);
        cellData.element.classList.add('mine');
        cellData.element.textContent = '💣';
        return;
    }

    // Flood fill logic
    const queue: Cell[] = [cellData];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        
        if (current.isRevealed || current.isFlagged) continue;
        
        current.isRevealed = true;
        current.element.classList.add('revealed');
        cellsRevealed++;

        if (current.neighborMines > 0) {
            current.element.textContent = current.neighborMines.toString();
            current.element.dataset.num = current.neighborMines.toString();
        } else {
            getNeighbors(current.x, current.y).forEach(n => {
                if (!n.isRevealed && !n.isFlagged && !n.isMine) {
                    queue.push(n);
                }
            });
        }
    }

    checkWinCondition();
}

function checkWinCondition(): void {
    if (cellsRevealed === (BOARD_WIDTH * BOARD_HEIGHT) - MINES_COUNT) {
        triggerGameOver(true);
    }
}

function triggerGameOver(isWin: boolean): void {
    gameOver = true;
    if (timerInterval) clearInterval(timerInterval);
    
    if (isWin) {
        restartBtn.textContent = FACES.win;
        mines.forEach(m => {
            if (!m.isFlagged) {
                m.isFlagged = true;
                m.element.classList.add('flagged');
            }
        });
        flagsPlaced = MINES_COUNT;
        updateMineCount();
        
        if (uiTimer > 0) {
            saveScore(uiTimer);
        }
    } else {
        restartBtn.textContent = FACES.lose;
        mines.forEach(m => {
            if (!m.isRevealed && !m.isFlagged) {
                m.element.classList.add('revealed');
                m.element.textContent = '💣';
            }
        });
        
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = board[y][x];
                if (cell.isFlagged && !cell.isMine) {
                    cell.element.classList.add('revealed');
                    cell.element.textContent = '❌';
                    cell.element.classList.remove('flagged');
                }
            }
        }
    }
}

restartBtn.addEventListener('click', initGame);
if (restartWrapper) restartWrapper.addEventListener('click', initGame);

function saveScore(time: number): void {
    const key = `gridsweeper_scores_${currentDifficulty}`;
    let scores: Score[] = JSON.parse(localStorage.getItem(key) || '[]');
    const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    scores.push({ time, date });
    scores.sort((a, b) => a.time - b.time);
    scores = scores.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(scores));
    renderLeaderboard();
}

function renderLeaderboard(): void {
    const key = `gridsweeper_scores_${currentDifficulty}`;
    let scores: Score[] = JSON.parse(localStorage.getItem(key) || '[]');
    leaderboardListElement.innerHTML = '';
    
    if (scores.length === 0) {
        noScoresMsgElement.style.display = 'block';
        leaderboardListElement.style.display = 'none';
        return;
    }
    
    noScoresMsgElement.style.display = 'none';
    leaderboardListElement.style.display = 'flex';
    
    scores.forEach(score => {
        const li = document.createElement('li');
        const dateSpan = document.createElement('span');
        dateSpan.textContent = score.date;
        const timeSpan = document.createElement('span');
        timeSpan.textContent = score.time.toString().padStart(3, '0') + 's';
        timeSpan.style.color = '#10b981';
        timeSpan.style.fontWeight = 'bold';
        
        li.appendChild(dateSpan);
        li.appendChild(timeSpan);
        leaderboardListElement.appendChild(li);
    });
}

const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const themeBtn = document.getElementById('theme-btn') as HTMLButtonElement;
const flagModeBtn = document.getElementById('flag-mode-btn') as HTMLButtonElement;
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const closeSettingsBtn = document.getElementById('close-settings') as HTMLButtonElement;
const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;

flagModeBtn.addEventListener('click', () => {
    flagModeActive = !flagModeActive;
    flagModeBtn.classList.toggle('active', flagModeActive);
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    const newDiff = difficultySelect.value as keyof typeof DIFFICULTIES;
    if (newDiff !== currentDifficulty) {
        currentDifficulty = newDiff;
        BOARD_WIDTH = DIFFICULTIES[newDiff].w;
        BOARD_HEIGHT = DIFFICULTIES[newDiff].h;
        MINES_COUNT = DIFFICULTIES[newDiff].m;
        initGame();
        renderLeaderboard();
    }
});

const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
let currentTheme: 'dark' | 'light' = preferDark ? 'dark' : 'light';
document.documentElement.dataset.theme = currentTheme;

themeBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = currentTheme;
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    currentTheme = e.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = currentTheme;
});

renderLeaderboard();
initGame();
