import React from 'react';
import { useNavigate } from 'react-router-dom';
import './small-board-fp.css';

const FPSmallBoard = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Open board-free-play with small board preset
    navigate('/board-free-play?board=small');
  };

  return (
    <div className="fps-container" onClick={handleClick}>
      <div className="fps-left">
        
      </div>
      <div className="fps-right">
        <img src="assets/small-text-board.png" alt="Small Board" className="fps-image" />
      </div>
    </div>
  );
};

export default FPSmallBoard;
