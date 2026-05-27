// Constants
const NOTE_NAMES = "C,C#,D,D#,E,F,F#,G,G#,A,A#,B".split(",");
const STRINGS_TUNING = "4,11,7,2,9,4".split(",").map(Number); // E B G D A E (descending visual)
const STRING_LABELS = "E,B,G,D,A,E".split(",");
const TOTAL_FRETS = 24;

const DICTIONARY = {
  scales: {
    'Natural Major': { intervals: "0,2,4,5,7,9,11".split(",").map(Number), degrees: {0:1,2:2, 4:3, 5:4, 7:5, 9:6, 11:7}, type: 'major' },
    'Natural Minor': { intervals: "0,2,3,5,7,8,10".split(",").map(Number), degrees: {0:1,2:2, 3:3, 5:4, 7:5, 8:6, 10:7}, type: 'minor' },
    'Major Pentatonic': { intervals: "0,2,4,7,9".split(",").map(Number), degrees: {0:1, 2:2,4:3, 7:5, 9:6}, type: 'major' },
    'Minor Pentatonic': { intervals: "0,3,5,7,10".split(",").map(Number), degrees: {0:1,3:3, 5:4, 7:5, 10:7}, type: 'minor' },
    'Minor Blues': { intervals: "0,3,5,6,7,10".split(",").map(Number), degrees: {0:1, 3:3, 5:4, 6:4, 7:5, 10:7}, type: 'minor' },
    'Major Blues': { intervals: "0,2,3,4,7,9".split(",").map(Number), degrees: {0:1, 2:2, 3:3, 4:3, 7:5, 9:6}, type: 'major' }
  },
  chords: {
    'Major': { intervals: "0,4,7".split(",").map(Number), degrees: {0:1, 4:3, 7:5}, type: 'major' },
    'Minor': { intervals: "0,3,7".split(",").map(Number), degrees: {0:1, 3:3, 7:5}, type: 'minor' },
    'Seventh (Minor 7)': { intervals: "0,3,7,10".split(",").map(Number), degrees: {0:1, 3:3, 7:5, 10:7}, type: 'minor' },
    'Diminished': { intervals: "0,3,6".split(",").map(Number), degrees: {0:1, 3:3, 6:5}, type: 'minor' },
    'Sus2': { intervals: "0,2,7".split(",").map(Number), degrees: {0:1, 2:2, 7:5}, type: 'major' },
    'Sus4': { intervals: "0,5,7".split(",").map(Number), degrees: {0:1, 5:4, 7:5}, type: 'major' },
    'Major 7th': { intervals: "0,4,7,11".split(",").map(Number), degrees: {0:1, 4:3, 7:5, 11:7}, type: 'major' },
    'Dominant 7': { intervals: "0,4,7,10".split(",").map(Number), degrees: {0:1, 4:3, 7:5, 10:7}, type: 'major' }
  }
};
// Elements
const keySelect = document.getElementById('key-select');
const modeSelect = document.getElementById('mode-select');
const typeSelect = document.getElementById('type-select');
const dropdownToggle = document.getElementById('caged-dropdown-toggle');

const checkboxesContainer = document.getElementById('caged-checkboxes-container');
const labelText = document.getElementById('dropdown-label-text');
const patternCheckboxes = checkboxesContainer.querySelectorAll('input[type="checkbox"]');

const displayMode = document.getElementById('display-mode');
const shapeSelect = document.getElementById('shape-select');
const fontColorPicker = document.getElementById('font-color-picker');
const boardColorPicker = document.getElementById('board-color-picker');
const visibilityToggle = document.getElementById('visibility-toggle');
const fretboardCanvas = document.getElementById('fretboard-canvas');
const fretNumbersLine = document.getElementById('fret-numbers-line');
const saveBtn = document.getElementById('save-settings-btn');

let manualOverrides = {};

// Init key options
NOTE_NAMES.forEach((note, idx) => {
  keySelect.add(new Option(note, idx));
});

// Populate scales/chords list
function populateStructures() {
  typeSelect.innerHTML = '';
  const category = modeSelect.value;
  Object.keys(DICTIONARY[category]).forEach(name => {
    typeSelect.add(new Option(name, name));
  });
  updateFretboardEngine();
}

// Build fretboard grid
function buildFretboardStructure() {
  fretboardCanvas.innerHTML = '';
  const targetDots = "3,5,7,9,15,17,19,21".split(",").map(Number);
  
  STRINGS_TUNING.forEach((rootIdx, stringIdx) => {
    const label = document.createElement('div');
    label.className = 'string-label';
    label.innerText = STRING_LABELS[stringIdx];
    fretboardCanvas.appendChild(label);
    
    for (let f = 1; f <= TOTAL_FRETS; f++) {
      const cell = document.createElement('div');
      cell.className = 'fret-cell';
      cell.setAttribute('data-fret', f);
      const gauge = 1 + (stringIdx * 0.4);
      cell.style.setProperty('--wire-thickness', `${gauge}px`);
      
      if (stringIdx === 2 || stringIdx === 3) {
        if (targetDots.includes(f)) {
          const dot = document.createElement('div');
          dot.className = 'dot-marker single';
          cell.appendChild(dot);
        }
      }
      if (f === 12 || f === 24) {
        if (stringIdx === 1) {
          const dotTop = document.createElement('div');
          dotTop.className = 'dot-marker double-top';
          cell.appendChild(dotTop);
        }
        if (stringIdx === 4) {
          const dotBot = document.createElement('div');
          dotBot.className = 'dot-marker double-bot';
          cell.appendChild(dotBot);
        }
      }
      
      const noteValue = (rootIdx + f) % 12;
      const marker = document.createElement('div');
      marker.className = 'note-marker';
      marker.setAttribute('data-string', stringIdx);
      marker.setAttribute('data-fret', f);
      marker.setAttribute('data-note', noteValue);
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        handleManualClick(stringIdx, f);
      });
      cell.appendChild(marker);
      fretboardCanvas.appendChild(cell);
    }
  });
  
  fretNumbersLine.innerHTML = '';
  const blankCorner = document.createElement('div');
  blankCorner.className = 'num-label';
  fretNumbersLine.appendChild(blankCorner);
  for (let f = 1; f <= TOTAL_FRETS; f++) {
    const num = document.createElement('div');
    num.className = 'num-label';
    num.innerText = f;
    fretNumbersLine.appendChild(num);
  }
}
// Pattern boundary logic
function checkPatternBoundary(fret, pattern, key, quality) {
  if (pattern === 'all') return true;
  let lowestEStringRootFret = (key - 4 + 12) % 12;
  if (lowestEStringRootFret === 0) lowestEStringRootFret = 12;
  const patternIndex = parseInt(pattern.replace('caged_', ''));
  let relativeOffset = 0;
  
  if (quality === 'major') {
    const majorOffsets = { 1: -3, 2: 0, 3: 2, 4: 5, 5: 7 };
    relativeOffset = majorOffsets[patternIndex];
  } else {
    const minorOffsets = { 1: 0, 2: 2, 3: 5, 4: 7, 5: 10 };
    relativeOffset = minorOffsets[patternIndex];
  }
  
  let startFret = ((lowestEStringRootFret + relativeOffset) );
  let endFret = startFret + 3;
  
  if (startFret < 1) { startFret += 12; endFret += 12; }
  if (startFret > 12) { startFret -= 12; endFret -= 12; }
  const inRange = (x, a, b) => x >= a && x <= b;
  const match1 = inRange(fret, startFret, endFret);
  const match2 = inRange(fret, startFret + 12, endFret + 12);
  const match3 = inRange(fret, startFret - 12, endFret - 12);
  return match1 || match2 || match3;
}

// Manual override toggle
function handleManualClick(string, fret) {
  const key = `${string}-${fret}`;
  manualOverrides[key] = !manualOverrides[key];
  updateFretboardEngine();
}

// Helper: Aggregates selected dropdown option values
function getSelectedPatterns() {
    const selected = [];
    patternCheckboxes.forEach(cb => {
        if (cb.checked) {
            selected.push(cb.value);
        }
    });
    return selected;
}


// Main rendering/update
function updateFretboardEngine() {
  const currentRoot = parseInt(keySelect.value);
  const category = modeSelect.value;
  const selectionName = typeSelect.value;
  const labelMode = displayMode.value;
  const currentShape = shapeSelect.value;
  const fontColor = fontColorPicker.value;
  
  if (!selectionName) return;
  const Formula = DICTIONARY[category][selectionName];
  const qualityType = Formula.type;
  
  if (visibilityToggle.checked) {
    fretboardCanvas.classList.remove('hide-all-notes');
  } else {
    fretboardCanvas.classList.add('hide-all-notes');
  }
  
  const activePatterns = getSelectedPatterns();
  const markers = fretboardCanvas.querySelectorAll('.note-marker');
  
  markers.forEach(marker => {
    const string = parseInt(marker.getAttribute('data-string'));
    const fret = parseInt(marker.getAttribute('data-fret'));
    const noteVal = parseInt(marker.getAttribute('data-note'));
    const structuralInterval = (noteVal - currentRoot + 12) % 12;
    
    let isInPatternBoundary = false;
    if (activePatterns.includes('all') || activePatterns.length === 0) {
      isInPatternBoundary = true;
    } else {
      isInPatternBoundary = activePatterns.some(pat => 
        checkPatternBoundary(fret, pat, currentRoot, qualityType)
      );
    }
    
    let isActiveTarget = Formula.intervals.includes(structuralInterval) && isInPatternBoundary;
    
    const overrideKey = `${string}-${fret}`;
    if (manualOverrides[overrideKey]) {
      isActiveTarget = !isActiveTarget;
    }
    
    marker.className = 'note-marker'; 
    marker.style.backgroundColor = '';
    marker.style.color = fontColor;
    
    const degreeNum = Formula.degrees[structuralInterval] || '';
    const noteNameText = NOTE_NAMES[noteVal];
    
    if (labelMode === 'names') {
      marker.innerText = noteNameText;
    } else if (labelMode === 'intervals') {
      marker.innerText = degreeNum ? degreeNum : noteNameText;
    } else {
      marker.innerText = degreeNum ? `${noteNameText}${degreeNum}` : noteNameText;
    }
    
    if (isActiveTarget) {
      marker.classList.add('active', currentShape);
      if (degreeNum) {
        marker.style.backgroundColor = document.getElementById(`col-${degreeNum}`).value;
      } else {
        marker.style.backgroundColor = '#475569';
      }
    }
  });
}
// Save/load settings
function saveToLocalStorage() {
  const config = {
    shape: shapeSelect.value,
    fontColor: fontColorPicker.value,
    boardColor: boardColorPicker.value,
    visibility: visibilityToggle.checked,
    colors: {}
  };
  for (let i = 1; i <= 7; i++) {
    config.colors[i] = document.getElementById(`col-${i}`).value;
  }
  localStorage.setItem('fretboard_custom_setup', JSON.stringify(config));
  alert('Settings, color profiles, and themes successfully saved!');
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem('fretboard_custom_setup');
  if (!stored) return;
  try {
    const config = JSON.parse(stored);
    shapeSelect.value = config.shape || 'shape-circle';
    fontColorPicker.value = config.fontColor || '#ffffff';
    
    if (config.boardColor) {
      boardColorPicker.value = config.boardColor;
      document.documentElement.style.setProperty('--fretboard-bg', config.boardColor);
    }
    
    if (config.visibility !== undefined) visibilityToggle.checked = config.visibility;
    if (config.colors) {
      for (let i = 1; i <= 7; i++) {
        if (config.colors[i]) {
          document.getElementById(`col-${i}`).value = config.colors[i];
        }
      }
    }
  } catch (e) {
    console.error("Error loading configurations", e);
  }
}

// Event wiring
modeSelect.addEventListener('change', populateStructures);
keySelect.addEventListener('change', updateFretboardEngine);
typeSelect.addEventListener('change', updateFretboardEngine);
displayMode.addEventListener('change', updateFretboardEngine);
shapeSelect.addEventListener('change', updateFretboardEngine);
fontColorPicker.addEventListener('input', updateFretboardEngine);
visibilityToggle.addEventListener('change', updateFretboardEngine);
saveBtn.addEventListener('click', saveToLocalStorage);

// Real-time background wood customization trigger
boardColorPicker.addEventListener('input', (event) => {
  document.documentElement.style.setProperty('--fretboard-bg', event.target.value);
});

// Dropdown change trigger
//patternSelect.addEventListener('change', updateFretboardEngine);

// Bootstrap Initialization
buildFretboardStructure();
loadFromLocalStorage();
populateStructures();


// Toggle display of the dropdown menu
dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    checkboxesContainer.classList.toggle('show');
    dropdownToggle.querySelector('.arrow').style.transform = 
        checkboxesContainer.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
});

// Close dropdown if clicking outside of it
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-multiselect')) {
        checkboxesContainer.classList.remove('show');
        dropdownToggle.querySelector('.arrow').style.transform = 'rotate(0deg)';
    }
});

// Handle checking logic and label update
patternCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const selected = getSelectedPatterns();

        // Mutual exclusivity rule logic
        if (e.target.value === 'all' && e.target.checked) {
            // If full view is checked, uncheck individual patterns
            patternCheckboxes.forEach(cb => { if (cb.value !== 'all') cb.checked = false; });
        } else if (e.target.value !== 'all' && e.target.checked) {
            // If individual pattern is checked, uncheck full view
            patternCheckboxes.forEach(cb => { if (cb.value === 'all') cb.checked = false; });
        }

        // Update label text dynamically based on selection
        const finalSelected = getSelectedPatterns();
        if (finalSelected.length === 0) {
            labelText.innerText = "Select Patterns...";
        } else if (finalSelected.includes('all')) {
            labelText.innerText = "Full Fretboard View";
        } else {
            labelText.innerText = `${finalSelected.length} Pattern(s) Active`;
        }

        // Trigger fretboard engine refresh
        updateFretboardEngine();
    });
});
