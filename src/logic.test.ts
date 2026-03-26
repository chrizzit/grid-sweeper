import { describe, it, expect } from 'vitest';
import { createBoard, placeMines, getNeighbors, calculateNeighbors, checkWinCondition, revealCellLogic } from './logic';

describe('Game Logic', () => {
    describe('createBoard', () => {
        it('should create a board of the correct dimensions', () => {
            const w = 10, h = 5;
            const board = createBoard(w, h);
            expect(board.length).toBe(h);
            expect(board[0].length).toBe(w);
            expect(board[0][0]).toMatchObject({ x: 0, y: 0, isMine: false, isRevealed: false });
        });
    });

    describe('getNeighbors', () => {
        it('should return correct number of neighbors for a corner cell', () => {
            const board = createBoard(3, 3);
            const neighbors = getNeighbors(board, 0, 0);
            expect(neighbors.length).toBe(3); // (0,1), (1,0), (1,1)
        });

        it('should return correct number of neighbors for a middle cell', () => {
            const board = createBoard(3, 3);
            const neighbors = getNeighbors(board, 1, 1);
            expect(neighbors.length).toBe(8);
        });
    });

    describe('placeMines', () => {
        it('should place the correct number of mines', () => {
            const board = createBoard(10, 10);
            const mines = placeMines(board, 10, 0, 0);
            expect(mines.length).toBe(10);
            
            let count = 0;
            board.forEach(row => row.forEach(cell => { if(cell.isMine) count++; }));
            expect(count).toBe(10);
        });

        it('should respect the safe zone around the first click', () => {
            const w = 10, h = 10;
            const clickX = 5, clickY = 5;
            const board = createBoard(w, h);
            placeMines(board, 80, clickX, clickY); // High density to force safety check

            // Safe zone is 3x3 centered at (5,5)
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    expect(board[clickY + dy][clickX + dx].isMine).toBe(false);
                }
            }
        });
    });

    describe('calculateNeighbors', () => {
        it('should calculate neighbor counts correctly', () => {
            const board = createBoard(3, 3);
            // M . .
            // . . .
            // . . .
            board[0][0].isMine = true;
            calculateNeighbors(board);
            expect(board[0][1].neighborMines).toBe(1);
            expect(board[1][0].neighborMines).toBe(1);
            expect(board[1][1].neighborMines).toBe(1);
            expect(board[2][2].neighborMines).toBe(0);
        });
    });

    describe('revealCellLogic', () => {
        it('should reveal a single cell with neighbors', () => {
            const board = createBoard(3, 3);
            board[0][0].isMine = true;
            calculateNeighbors(board);
            const revealed = revealCellLogic(board, board[0][1]);
            expect(revealed.length).toBe(1);
            expect(board[0][1].isRevealed).toBe(true);
        });

        it('should reveal multiple cells using flood-fill', () => {
            const board = createBoard(3, 3);
            // . . .
            // . . .
            // . . M
            board[2][2].isMine = true;
            calculateNeighbors(board);
            
            // Clicking (0,0) should reveal everything except (2,2) and its immediate neighbors (1,2) and (2,1)
            // Wait, (1,1) also neighbors (2,2). 
            // So (0,0), (0,1), (0,2), (1,0), (2,0) are 0-count.
            // (1,1), (1,2), (2,1) have count 1.
            const revealed = revealCellLogic(board, board[0][0]);
            expect(revealed).toContain(board[0][0]);
            expect(revealed).toContain(board[1][1]);
            expect(board[2][2].isRevealed).toBe(false);
        });
    });

    describe('checkWinCondition', () => {
        it('should return true when all non-mine cells are revealed', () => {
            const board = createBoard(2, 2);
            board[0][0].isMine = true;
            board[0][1].isRevealed = true;
            board[1][0].isRevealed = true;
            board[1][1].isRevealed = true;
            expect(checkWinCondition(board, 1)).toBe(true);
        });

        it('should return false when not all non-mine cells are revealed', () => {
            const board = createBoard(2, 2);
            board[0][0].isMine = true;
            board[0][1].isRevealed = true;
            expect(checkWinCondition(board, 1)).toBe(false);
        });
    });
});
