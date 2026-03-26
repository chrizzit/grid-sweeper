import './pwa';
import { initAnalytics, trackEvent } from './analytics';
import { CellData, createBoard, placeMines, checkWinCondition, revealCellLogic } from './logic';

interface Difficulty {
    w: number;
    h: number;
    m: number;
}

interface Cell extends CellData {
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

function vibrate(pattern: number | number[]): void {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(pattern);
    }
}

function initGame(): void {
    gameOver = false;
    firstClick = true;
    cellsRevealed = 0;
    uiTimer = 0;
    flagsPlaced = 0;
    
    // Track game start
    trackEvent('game_start', {
        difficulty: currentDifficulty,
        mines: MINES_COUNT
    });
    if (timerInterval) clearInterval(timerInterval);
    timerElement.textContent = '000';
    updateMineCount();
    restartBtn.textContent = FACES.normal;
    
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 1fr)`;
    document.documentElement.style.setProperty('--board-width', BOARD_WIDTH.toString());
    document.documentElement.style.setProperty('--board-height', BOARD_HEIGHT.toString());
    
    const logicalBoard = createBoard(BOARD_WIDTH, BOARD_HEIGHT);
    board = [];
    mines = [];

    for (let y = 0; y < BOARD_HEIGHT; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cellData = logicalBoard[y][x];
            const cellElement = document.createElement('div');
            const cell: Cell = {
                ...cellData,
                element: cellElement
            };
            
            cell.element.classList.add('cell');
            cell.element.dataset.x = x.toString();
            cell.element.dataset.y = y.toString();
            
            cell.element.addEventListener('mousedown', (e) => handleCellMouseDown(e, cell));
            cell.element.addEventListener('mouseup', (e) => handleCellMouseUp(e, cell));
            cell.element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(cell);
            });
            cell.element.addEventListener('mouseleave', () => {
                if (!gameOver) restartBtn.textContent = FACES.normal;
            });

            // Touch events for mobile support
            cell.element.addEventListener('touchstart', (e) => handleCellTouchStart(e, cell), { passive: false });
            cell.element.addEventListener('touchend', (e) => handleCellTouchEnd(e, cell));
            cell.element.addEventListener('touchmove', () => {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                cell.element.classList.remove('touch-active');
            });

            boardElement.appendChild(cell.element);
            row.push(cell);
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
        vibrate(50);
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

// Logic moved to logic.ts

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
        vibrate(10);
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
        const placedMines = placeMines(board, MINES_COUNT, cellData.x, cellData.y);
        mines = placedMines as Cell[]; // Cast to Cell[] as it now has element pointers from board
        startTimer();
        vibrate(30);
    }

    if (cellData.isMine) {
        triggerGameOver(false);
        cellData.element.classList.add('mine');
        cellData.element.textContent = '💣';
        return;
    }

    const revealed = revealCellLogic(board, cellData);
    revealed.forEach(c => {
        const cell = c as Cell;
        cell.element.classList.add('revealed');
        if (cell.neighborMines > 0) {
            cell.element.textContent = cell.neighborMines.toString();
            cell.element.dataset.num = cell.neighborMines.toString();
        }
        cellsRevealed++;
    });

    if (checkWinCondition(board, MINES_COUNT)) {
        triggerGameOver(true);
    }
}

// Logic moved to logic.ts

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
        vibrate([50, 100, 50, 100, 50]);
        
        // Track game win
        trackEvent('game_won', {
            difficulty: currentDifficulty,
            time: uiTimer,
            mines: MINES_COUNT
        });
    } else {
        restartBtn.textContent = FACES.lose;
        vibrate([100, 50, 100]);
        // Track game loss
        trackEvent('game_lost', {
            difficulty: currentDifficulty,
            time: uiTimer,
            mines: MINES_COUNT
        });
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

restartBtn.addEventListener('click', () => {
    initGame();
    vibrate(30);
});
if (restartWrapper) {
    restartWrapper.addEventListener('click', () => {
        initGame();
        vibrate(30);
    });
}

function saveScore(time: number): void {
    const key = `gridsweeper_scores_${currentDifficulty}`;
    let scores: Score[] = JSON.parse(localStorage.getItem(key) || '[]');
    const isNewPB = scores.length === 0 || time < scores[0].time;
    const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    scores.push({ time, date });
    scores.sort((a, b) => a.time - b.time);
    scores = scores.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(scores));
    renderLeaderboard();
    if (isNewPB) vibrate([30, 30, 30, 30, 30]);
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
    vibrate(20);
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    vibrate(20);
    const newDiff = difficultySelect.value as keyof typeof DIFFICULTIES;
    if (newDiff !== currentDifficulty) {
        currentDifficulty = newDiff;
        BOARD_WIDTH = DIFFICULTIES[newDiff].w;
        BOARD_HEIGHT = DIFFICULTIES[newDiff].h;
        MINES_COUNT = DIFFICULTIES[newDiff].m;
        initGame();
        renderLeaderboard();
        vibrate(40);
        
        // Track difficulty change
        trackEvent('difficulty_change', {
            difficulty: newDiff
        });
    }
});

const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
let currentTheme: 'dark' | 'light' = preferDark ? 'dark' : 'light';
document.documentElement.dataset.theme = currentTheme;

themeBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = currentTheme;
    vibrate(20);
    
    // Track theme toggle
    trackEvent('theme_toggle', {
        theme: currentTheme
    });
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    currentTheme = e.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = currentTheme;
});

initAnalytics();
renderLeaderboard();
initGame();
