import { fabric } from 'fabric';
import {
  COLUMNS_COUNT,
  PADDING,
  ROWS_COUNT,
  FALLING_DURATION,
  FAST_FORWARD_DURATION,
  LETTER_DROP_DELAY,
  EASY_DIFFICULTY_VALUE,
  COLORS,
  FIRST_LETTER_DROP_DELAY
} from '../../../constants/gameConstants';
import { addControls } from './controls';
import { createLetter, animateLetterDown } from './letters';

// store
import { gameStore } from '../../../stores';

import { getRandomItem } from '../../../utils';

let board = null;
let letterWidth = 0;
let columnRowWidth = 0;
let desiredWords = [];
let coloredLetters = [];
let nextLetter = '';

// utils
const getFallingLetter = () => board.getObjects().find(o => o.mIsActive);
const getToRemoveLetter = () =>
  board.getObjects().find(letter => letter.mIsGonnaRemove);
const getRootVar = prop =>
  getComputedStyle(document.body).getPropertyValue(prop);

const specifyLettersColors = () => {
  // shallow clone of colors
  let derivedColors = COLORS.slice(0);
  desiredWords.forEach(word => {
    // remove selected color from the list
    const filterDerivedColors = color => {
      derivedColors = derivedColors.filter(
        derivedColor => derivedColor !== color
      );
    };

    const wordRandomColor = getRandomItem(derivedColors);
    filterDerivedColors(wordRandomColor);

    word.split('').forEach(letter => {
      const containedWords = desiredWords.filter(w => w.includes(letter));

      const isLetterExisting = coloredLetters.find(
        coloredLetter => coloredLetter.text === letter
      );

      if (containedWords.length === 1 && !isLetterExisting)
        coloredLetters.push({ text: letter, color: wordRandomColor });
      // if that letter is included in more than one word we give it a different color
      else if (containedWords.length > 1) {
        const randomColor = getRandomItem(derivedColors);
        if (!isLetterExisting) {
          coloredLetters.push({
            text: letter,
            color: randomColor
          });
        }
        filterDerivedColors(randomColor);
      }
    });
  });
};

const generateBoardBackground = () => {
  const greyBg = getRootVar('--color-blue-light');
  const whiteBg = getRootVar('--color-white');
  for (let index = 0; index < COLUMNS_COUNT; index++) {
    const rectangle = new fabric.Rect({
      left: index * columnRowWidth,
      top: 0,
      width: columnRowWidth,
      height: board.getHeight(),
      fill: index % 2 ? greyBg : whiteBg,
      selectable: false,
      mIsBackground: true // properties starting with "m" are the custom ones
    });
    board.add(rectangle);
  }
};

// returns the color for wanted letter
const getLetterColor = letter =>
  coloredLetters.find(coloredLetter => coloredLetter.text === letter).color;

// returns the next letter to fall
const getNextLetter = () => {
  const toFallLetters = [];
  const totalLetters = board
    .getObjects()
    .filter(o => o.mIsLetter)
    .map(o => o.mText);
  desiredWords.forEach(word => {
    word.split('').forEach(letter => {
      const thisLetterBlocks = board
        .getObjects()
        .filter(o => o.mIsLetter && o.mText === letter);
      let amountValue = thisLetterBlocks.length / totalLetters.length;
      if (!totalLetters.length) amountValue = 0;
      toFallLetters.push({ text: letter, amountValue });
    });
  });

  let desiredLetter = '';

  // find the lowest value
  const lowestValue = toFallLetters
    .map(block => block.amountValue)
    .reduce((prev, cur) => (prev < cur ? prev : cur));

  // find all letters with the least abundance
  const lows = toFallLetters.filter(block => block.amountValue === lowestValue);

  // add the luck and difficulty!
  const remainingLetters = toFallLetters.filter(
    toFallLetter => !lows.find(low => low.text === toFallLetter.text)
  );
  if (remainingLetters.length) {
    for (let j = 0; j < EASY_DIFFICULTY_VALUE; j++) {
      lows.push(getRandomItem(remainingLetters));
    }
  }

  // pick out one of them randomly
  desiredLetter = getRandomItem(lows).text;

  return desiredLetter;
};

const getIsUserLost = () => {
  // check if the middle column is filled
  const middleColumnLetters = board
    .getObjects()
    .filter(o => o.mIsLetter)
    .filter(o => o.mGetColumn() === Math.floor(COLUMNS_COUNT / 2) + 1);
  const isLost = middleColumnLetters.length === ROWS_COUNT;
  if (isLost) gameStore.handleGameover();
  return isLost;
};

const dropLetter = isFirstDrop => {
  const normalDrop = () => {
    if (getIsUserLost() || getFallingLetter()) return;
    const startDrop = () => {
      const group = createLetter(nextLetter, {
        left: Math.floor(COLUMNS_COUNT / 2) * columnRowWidth + PADDING,
        top: 0,
        color: getLetterColor(nextLetter)
      });
      group.mRemainingTime = FALLING_DURATION;
      group.mIsActive = true;
      animateLetterDown();

      // update nextLetter
      nextLetter = getNextLetter();
      gameStore.updateNextLetter({
        text: nextLetter,
        color: getLetterColor(nextLetter)
      });
    };

    // a short delay in order to drop letter
    setTimeout(startDrop, LETTER_DROP_DELAY);
  };
  if (isFirstDrop) {
    // a delay for user to take a look at the words
    setTimeout(normalDrop, FIRST_LETTER_DROP_DELAY);
  } else normalDrop();
};

const getRows = () => {
  const rows = [];
  const allLetters = board.getObjects().filter(o => o.mIsLetter);
  for (let i = 1; i <= ROWS_COUNT; i++) {
    const indexedRows = allLetters.filter(letter => letter.mGetRow() === i);
    if (indexedRows.length) {
      const filledEmpties = [];
      for (let j = 1; j <= COLUMNS_COUNT; j++) {
        const foundLetter = indexedRows.find(
          letter => letter.mGetColumn() === j
        );

        // create a formatted string of all letters in a row in rtl format
        if (foundLetter) filledEmpties.push(foundLetter);
        // if it's empty we use a - character instead
        else
          filledEmpties.push({
            mIsEmpty: true,
            mText: '-',
            mGetColumn: () => j
          });
      }
      // reverse for rtl word match checking
      rows.push({ row: i, letters: filledEmpties.reverse() });
    }
  }
  return rows;
};

const getColumns = () => {
  const columns = [];
  const allLetters = board.getObjects().filter(o => o.mIsLetter);
  for (let i = 1; i <= COLUMNS_COUNT; i++) {
    const indexedColumns = allLetters.filter(
      letter => letter.mGetColumn() === i
    );
    if (indexedColumns.length) {
      const filledEmpties = [];
      for (let j = 1; j <= ROWS_COUNT; j++) {
        const foundLetter = indexedColumns.find(
          letter => letter.mGetRow() === j
        );

        // create a formatted string of all letters in a column
        if (foundLetter) filledEmpties.push(foundLetter);
        // if it's empty we use a - character instead
        else
          filledEmpties.push({ mIsEmpty: true, mText: '-', mGetRow: () => j });
      }
      // reverse for rtl word match checking
      columns.push({ column: i, letters: filledEmpties.reverse() });
    }
  }
  return columns;
};

// move down letters which are above this removed letter
const moveTopLettersDown = letters => {
  const groupByColumn = arr =>
    arr.reduce((prev, cur) => {
      (prev[cur.mGetColumn()] = prev[cur.mGetColumn()] || []).push(cur);
      return prev;
    }, {});
  return new Promise(resolve => {
    const columnsObject = groupByColumn(letters);
    const columnKeys = Object.keys(columnsObject);

    columnKeys.forEach((key, columnIndex) => {
      const column = columnsObject[key];
      const lowestTopLetter = column.reduce(
        (prev, cur) => (prev.mGetRow() > cur.mGetRow() ? prev : cur)
      );

      let stopPosition = 0;
      const lowerLetters = board
        .getObjects()
        .filter(
          o =>
            o.mIsLetter &&
            !o.mIsActive &&
            o.mGetColumn() === lowestTopLetter.mGetColumn() &&
            o.mGetRow() > lowestTopLetter.mGetRow()
        )
        .map(l => l.top);
      if (lowerLetters.length) {
        stopPosition = lowerLetters.reduce(
          (prev, cur) => (prev < cur ? prev : cur)
        );
      } else stopPosition = board.getHeight();
      const distance = stopPosition - (lowestTopLetter.top + columnRowWidth);
      column.forEach((letter, letterIndex) => {
        letter.animate('top', letter.top + distance, {
          duration: FAST_FORWARD_DURATION,
          onChange: board.renderAll.bind(board),
          onComplete() {
            if (
              letterIndex === column.length - 1 &&
              columnIndex === columnKeys.length - 1
            ) {
              resolve();
            }
          }
        });
      });
    });
  });
};

const removeMatchedLetters = letters => {
  const toMoveDownLetters = [];
  letters.forEach((letter, index) => {
    letter.mIsGonnaRemove = true;
    const animateRemove = () => {
      letter.rotate(letter.angle + 3);
      letter.scaleX -= 0.05;
      letter.scaleY -= 0.05;
      letter.opacity -= 0.1;
      board.renderAll();
      const frames = fabric.util.requestAnimFrame(animateRemove);
      if (letter.opacity < 0.1) {
        cancelAnimationFrame(frames);
        const column = letter.mGetColumn();
        const top = letter.top;
        board.remove(letter);

        // check for letters above
        const sameColumnLetters = board
          .getObjects()
          .filter(
            o =>
              o.mIsLetter &&
              column === o.mGetColumn() &&
              o.top < top &&
              !o.mIsActive &&
              !o.mIsGonnaRemove
          );
        toMoveDownLetters.push(...sameColumnLetters);

        if (index === letters.length - 1) {
          if (toMoveDownLetters.length) {
            moveTopLettersDown(toMoveDownLetters).then(() => {
              check();
            });
          } else dropLetter();
        }
      }
    };
    animateRemove();
  });
};

const check = doneLetter => {
  if (doneLetter) {
    doneLetter.mIsFallingStopped = false;
    doneLetter.mIsFastForwarding = false;
    doneLetter.mIsActive = false;
  }

  const rows = getRows();
  const columns = getColumns();
  const matchedWords = [];
  const matchedLetters = [];

  // check rows for a match
  rows.forEach(row => {
    const stickedLetters = row.letters.reduce(
      (prev, cur) => `${prev}${cur.mText}`,
      ''
    );
    desiredWords.forEach(word => {
      const foundIndex = stickedLetters.search(word);
      if (foundIndex !== -1) {
        matchedWords.push(word);
        for (
          let index = foundIndex;
          index < word.length + foundIndex;
          index++
        ) {
          // (COLUMNS_COUNT + 1) - ... for rtl columns
          const foundLetter = row.letters.find(
            letter => COLUMNS_COUNT + 1 - letter.mGetColumn() === index + 1
          );
          foundLetter.mIsMatchedRow = true;
        }
      }
    });
    matchedLetters.push(...row.letters.filter(letter => letter.mIsMatchedRow));
  });

  // check columns for a match
  columns.forEach(column => {
    const stickedLetters = column.letters.reduce(
      (prev, cur) => `${prev}${cur.mText}`,
      ''
    );
    const searchForWords = (toSearch, isReverse) => {
      desiredWords.forEach(word => {
        const computedWord = isReverse
          ? word
              .split('')
              .reverse()
              .join('')
          : word;
        const foundIndex = toSearch.search(computedWord);
        if (foundIndex !== -1) {
          matchedWords.push(word);
          for (
            let index = foundIndex;
            index < computedWord.length + foundIndex;
            index++
          ) {
            // (COLUMNS_COUNT + 1) - ... for rtl columns
            const foundLetter = column.letters.find(
              letter => ROWS_COUNT + 1 - letter.mGetRow() === index + 1
            );
            foundLetter.mIsMatchedColumn = true;
          }
        }
      });
    };

    // for both top to bottom and bottom to top checking
    searchForWords(stickedLetters);
    searchForWords(stickedLetters, true);
    matchedLetters.push(
      ...column.letters.filter(letter => letter.mIsMatchedColumn)
    );
  });

  // remove matched letters
  removeMatchedLetters(matchedLetters);
  if (matchedWords.length) gameStore.handleWordsMatch(matchedWords);
  else dropLetter();
};

const createBoard = words => {
  const gameBoardWrapper = document.getElementById('gameBoardWrapper');
  const { width } = gameBoardWrapper.getBoundingClientRect();
  const height = (ROWS_COUNT / COLUMNS_COUNT) * width + PADDING;
  gameBoardWrapper.style.height = height;
  board = new fabric.Canvas('gameBoard');
  board.setWidth(width);
  board.setHeight(height);
  letterWidth = board.getWidth() / COLUMNS_COUNT - PADDING * 2;
  columnRowWidth = board.getWidth() / COLUMNS_COUNT;
  desiredWords = words;
  nextLetter = getNextLetter();
  generateBoardBackground();
  specifyLettersColors();
  addControls();
  dropLetter(true);
};

const clearBoard = () => {
  if (!board) return;
  board.clear();
  const gameBoardWrapper = document.getElementById('gameBoardWrapper');
  const containers = gameBoardWrapper.querySelectorAll('.canvas-container');
  containers.forEach(container => {
    container.remove();
  });
};

const toggleGamePause = value => {
  const fallingLetter = getFallingLetter();
  fallingLetter.mIsFallingStopped = value;
  if (!value) animateLetterDown();
};

export {
  createBoard,
  board,
  letterWidth,
  columnRowWidth,
  getFallingLetter,
  getRootVar,
  check,
  getLetterColor,
  dropLetter,
  moveTopLettersDown,
  clearBoard,
  toggleGamePause,
  getToRemoveLetter
};
