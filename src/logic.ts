export interface CellData {
    x: number;
    y: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

export function createBoard(width: number, height: number): CellData[][] {
    const board: CellData[][] = [];
    for (let y = 0; y < height; y++) {
        const row: CellData[] = [];
        for (let x = 0; x < width; x++) {
            row.push({
                x, y,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            });
        }
        board.push(row);
    }
    return board;
}

export function getNeighbors(board: CellData[][], x: number, y: number): CellData[] {
    const height = board.length;
    const width = board[0].length;
    const neighbors: CellData[] = [];

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                neighbors.push(board[ny][nx]);
            }
        }
    }
    return neighbors;
}

export function placeMines(board: CellData[][], minesCount: number, firstClickX: number, firstClickY: number): CellData[] {
    const height = board.length;
    const width = board[0].length;
    const mines: CellData[] = [];
    let minesPlaced = 0;

    while (minesPlaced < minesCount) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        
        const isSafeZone = Math.abs(x - firstClickX) <= 1 && Math.abs(y - firstClickY) <= 1;
        
        if (!board[y][x].isMine && !isSafeZone) {
            board[y][x].isMine = true;
            mines.push(board[y][x]);
            minesPlaced++;
        }
    }
    
    calculateNeighbors(board);
    return mines;
}

export function calculateNeighbors(board: CellData[][]): void {
    const height = board.length;
    const width = board[0].length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (board[y][x].isMine) continue;
            let count = 0;
            getNeighbors(board, x, y).forEach(n => {
                if (n.isMine) count++;
            });
            board[y][x].neighborMines = count;
        }
    }
}

export function checkWinCondition(board: CellData[][], minesCount: number): boolean {
    const height = board.length;
    const width = board[0].length;
    let revealedCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (board[y][x].isRevealed) revealedCount++;
        }
    }

    return revealedCount === (width * height) - minesCount;
}

/**
 * Performs flood-fill to reveal empty cells. 
 * Returns an array of cells that were revealed during this step.
 */
export function revealCellLogic(board: CellData[][], startCell: CellData): CellData[] {
    if (startCell.isRevealed || startCell.isFlagged) return [];

    const revealedThisTurn: CellData[] = [];
    const queue: CellData[] = [startCell];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.isRevealed || current.isFlagged) continue;

        current.isRevealed = true;
        revealedThisTurn.push(current);

        if (current.neighborMines === 0 && !current.isMine) {
            getNeighbors(board, current.x, current.y).forEach(n => {
                if (!n.isRevealed && !n.isFlagged && !n.isMine) {
                    queue.push(n);
                }
            });
        }
    }
    return revealedThisTurn;
}
