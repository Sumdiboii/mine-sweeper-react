import React, { useState, useEffect } from 'react';
import './minesweeper-board-fp.css';

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      revealed: false,
      flagged: false,
      mine: false,
      adjacent: 0,
    }))
  );
}

function placeMines(board, mines) {
  let placed = 0;
  const rows = board.length;
  const cols = board[0].length;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }
}

function calculateAdjacents(board) {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
}

function revealCell(board, r, c) {
  if (board[r][c].revealed || board[r][c].flagged) return;
  board[r][c].revealed = true;
  if (board[r][c].adjacent === 0 && !board[r][c].mine) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (
          nr >= 0 && nr < board.length &&
          nc >= 0 && nc < board[0].length &&
          !board[nr][nc].revealed &&
          !board[nr][nc].mine
        ) {
          revealCell(board, nr, nc);
        }
      }
    }
  }
}

const MinesweeperBoardFP = ({ onFirstClick, gameReset, onGameOver, rows = 9, cols = 9, mines = 10, proMode = false }) => {
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [firstClick, setFirstClick] = useState(false);
  const [firstClickPos, setFirstClickPos] = useState(null);

  useEffect(() => {
    const newBoard = createEmptyBoard(rows, cols);
    placeMines(newBoard, mines);
    calculateAdjacents(newBoard);
    setBoard(newBoard);
    setGameOver(false);
    setWin(false);
    setFirstClick(false);
    setFirstClickPos(null);
  }, [gameReset, rows, cols, mines]);

  useEffect(() => {
    if ((gameOver || win) && onGameOver) {
      onGameOver();
    }
  }, [gameOver, win, onGameOver]);

  // Helper to get all neighbors (including self)
  const getNeighbors = (r, c, board) => {
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
          neighbors.push([nr, nc]);
        }
      }
    }
    return neighbors;
  };

  // Place mines, avoiding the first click and its neighbors
  const placeMinesSafe = (rows, cols, mines, safeR, safeC) => {
    const board = createEmptyBoard(rows, cols);
    const forbidden = new Set(getNeighbors(safeR, safeC, board).map(([r, c]) => r + "," + c));
    let placed = 0;
    while (placed < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!board[r][c].mine && !forbidden.has(r + "," + c)) {
        board[r][c].mine = true;
        placed++;
      }
    }
    calculateAdjacents(board);
    return board;
  };

  const handleCellClick = (r, c) => {
    if (gameOver || win) return;
    if (board[r][c].flagged) return;
    if (!firstClick) {
      setFirstClick(true);
      setFirstClickPos([r, c]);
      if (onFirstClick) onFirstClick();
      // Regenerate board so first click is always safe and reveals a cluster
      const safeBoard = placeMinesSafe(rows, cols, mines, r, c);
      revealCell(safeBoard, r, c);
      setBoard(safeBoard);
      // Check win
      const allSafeRevealed = safeBoard.flat().filter(cell => !cell.mine).every(cell => cell.revealed);
      if (allSafeRevealed) setWin(true);
      return;
    }
    // If clicking a revealed number, try to auto-reveal adjacents (chording)
    if (board[r][c].revealed && board[r][c].adjacent > 0 && !board[r][c].mine) {
      const flaggedCount = [-1,0,1].flatMap(dr => [-1,0,1].map(dc => {
        if (dr === 0 && dc === 0) return 0;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
          return board[nr][nc].flagged ? 1 : 0;
        }
        return 0;
      })).reduce((a,b) => a+b, 0);
      if (flaggedCount === board[r][c].adjacent) {
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
              if (!newBoard[nr][nc].revealed && !newBoard[nr][nc].flagged) {
                revealCell(newBoard, nr, nc);
              }
            }
          }
        }
        setBoard(newBoard);
        // Check win
        const allSafeRevealed = newBoard.flat().filter(cell => !cell.mine).every(cell => cell.revealed);
        if (allSafeRevealed) setWin(true);
        // If a mine is revealed, game over
        if (newBoard.flat().some(cell => cell.revealed && cell.mine)) {
          setGameOver(true);
          setBoard(newBoard.map(row => row.map(cell => ({ ...cell, revealed: true }))));
        }
        return;
      }
    }
    // Normal reveal logic
    if (board[r][c].mine) {
      setGameOver(true);
      const revealAll = board.map(row => row.map(cell => ({ ...cell, revealed: true })));
      setBoard(revealAll);
      return;
    }
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    revealCell(newBoard, r, c);
    setBoard(newBoard);
    // Check win
    const allSafeRevealed = newBoard.flat().filter(cell => !cell.mine).every(cell => cell.revealed);
    if (allSafeRevealed) setWin(true);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || win) return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[r][c].flagged = !newBoard[r][c].flagged;
    setBoard(newBoard);
  };

  // Helper: check if all adjacent cells are revealed or flagged
  const areAllAdjacentsFlaggedOrRevealed = (r, c, board) => {
    const rows = board.length;
    const cols = board[0].length;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          if (!board[nr][nc].revealed && !board[nr][nc].flagged) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // New: handle double click or click on revealed number to auto-reveal adjacents
  const handleCellDoubleClick = (r, c) => {
    if (!board[r][c].revealed || board[r][c].mine || board[r][c].adjacent === 0) return;
    const flaggedCount = [-1,0,1].flatMap(dr => [-1,0,1].map(dc => {
      if (dr === 0 && dc === 0) return 0;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
        return board[nr][nc].flagged ? 1 : 0;
      }
      return 0;
    })).reduce((a,b) => a+b, 0);
    if (flaggedCount === board[r][c].adjacent) {
      const newBoard = board.map(row => row.map(cell => ({ ...cell })));
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
            if (!newBoard[nr][nc].revealed && !newBoard[nr][nc].flagged) {
              revealCell(newBoard, nr, nc);
            }
          }
        }
      }
      setBoard(newBoard);
      // Check win
      const allSafeRevealed = newBoard.flat().filter(cell => !cell.mine).every(cell => cell.revealed);
      if (allSafeRevealed) setWin(true);
      // If a mine is revealed, game over
      if (newBoard.flat().some(cell => cell.revealed && cell.mine)) {
        setGameOver(true);
        setBoard(newBoard.map(row => row.map(cell => ({ ...cell, revealed: true }))));
      }
    }
  };

  // Determine board size class
  let boardSizeClass = '';
  if (rows === 9 && cols === 9) boardSizeClass = 'small-board';
  else if (rows === 16 && cols === 16) boardSizeClass = 'med-board';
  else if (rows === 16 && cols === 30) boardSizeClass = 'lrg-board';

  return (
    <div className={`minesweeper-board-fp ${boardSizeClass}`}>
      <div className="board-grid">
        {board.map((row, r) => (
          <div className="board-row" key={r}>
            {row.map((cell, c) => (
              <div
                className={`cell${cell.revealed ? ' revealed' : ''}${cell.flagged ? ' flagged' : ''}${proMode ? ' pro-mode' : ''}`}
                key={c}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={e => handleRightClick(e, r, c)}
                onDoubleClick={() => handleCellDoubleClick(r, c)}
              >
                {cell.revealed && cell.mine && '💣'}
                {cell.revealed && !cell.mine && cell.adjacent > 0 && cell.adjacent}
                {!cell.revealed && cell.flagged && !proMode && '🚩'}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MinesweeperBoardFP;
