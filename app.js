const { useState, useEffect } = React;
const e = React.createElement;

const CATEGORY_COLORS = {
  gene: { bg: 'bg-rose-600', selected: 'bg-rose-500', found: 'bg-rose-900/40', border: 'border-rose-400', text: 'text-rose-100' },
  mechanism: { bg: 'bg-blue-600', selected: 'bg-blue-500', found: 'bg-blue-900/40', border: 'border-blue-400', text: 'text-blue-100' },
  inheritance: { bg: 'bg-purple-600', selected: 'bg-purple-500', found: 'bg-purple-900/40', border: 'border-purple-400', text: 'text-purple-100' },
  symptom: { bg: 'bg-emerald-600', selected: 'bg-emerald-500', found: 'bg-emerald-900/40', border: 'border-emerald-400', text: 'text-emerald-100' }
};

let audioCtx = null;
const playSfx = (freq, type = 'sine', duration = 0.1) => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.connect(gain); gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
};

function App() {
  const [view, setView] = useState('landing');
  const [gameBoard, setGameBoard] = useState([]);
  const [selected, setSelected] = useState([]);
  const [foundGroups, setFoundGroups] = useState([]); // Array of arrays of indices
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("");
  const [unlocked, setUnlocked] = useState([]);
  const [showDetail, setShowDetail] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('genelink_unlocked_full');
    if (saved) setUnlocked(JSON.parse(saved));
  }, []);

  const initGame = () => {
    playSfx(660);
    if (typeof GENETIC_DIAGNOSES === 'undefined') return;
    const pool = GENETIC_DIAGNOSES;
    const idxs = [];
    while(idxs.length < 4) {
        let r = Math.floor(Math.random() * pool.length);
        if(!idxs.includes(r)) idxs.push(r);
    }
    const selectedSet = idxs.map(i => pool[i]);
    const clues = selectedSet.flatMap((d, i) => d.clues.map(c => ({ ...c, group: i, name: d.name, fullData: d })));
    setGameBoard(clues.sort(() => Math.random() - 0.5));
    setFoundGroups([]);
    setMistakes(0);
    setSelected([]);
    setMessage("SYSTEM READY");
    setView('game');
  };

  const handleSelect = (i) => {
    if (foundGroups.flat().includes(i) || mistakes >= 4) return;
    playSfx(440, 'triangle', 0.05);
    if (selected.includes(i)) setSelected(selected.filter(idx => idx !== i));
    else if (selected.length < 4) setSelected([...selected, i]);
  };

  const submit = () => {
    const group = gameBoard[selected[0]].group;
    const diagnosis = gameBoard[selected[0]].fullData;
    if (selected.every(i => gameBoard[i].group === group)) {
      playSfx(880, 'sine', 0.2);
      setFoundGroups([...foundGroups, selected]);
      setShowDetail(diagnosis);
      if (!unlocked.find(u => u.name === diagnosis.name)) {
        const nextUnlocked = [...unlocked, diagnosis];
        setUnlocked(nextUnlocked);
        localStorage.setItem('genelink_unlocked_full', JSON.stringify(nextUnlocked));
      }
      setSelected([]);
      setMessage("SEQUENCE VERIFIED");
    } else {
      playSfx(150, 'sawtooth', 0.3);
      setMistakes(m => m + 1);
      setMessage("DECODING ERROR");
    }
  };

  const isLoss = mistakes >= 4;

  // REVEAL LOGIC: Organize board by groups if player loses
  const displayBoard = isLoss ? [...gameBoard].sort((a, b) => a.group - b.group) : gameBoard;

  const renderGrid = () => (
    e('div', {className: 'space-y-4 mb-8'},
      // Map through groups to show names during reveal
      [0,1,2,3].map(groupNum => {
        const groupClues = displayBoard.filter(c => c.group === groupNum);
        const isGroupFound = foundGroups.some(g => gameBoard[g[0]].group === groupNum);
        
        return e('div', {key: groupNum, className: 'space-y-1'},
          (isLoss || isGroupFound) && e('div', {className: 'text-[9px] font-black text-slate-500 uppercase ml-1'}, groupClues[0].name),
          e('div', {className: 'grid grid-cols-4 gap-2'},
            groupClues.map((clue) => {
              const originalIndex = gameBoard.indexOf(clue);
              const isFound = foundGroups.some(g => g.includes(originalIndex));
              const isSelected = selected.includes(originalIndex);
              const theme = CATEGORY_COLORS[clue.category];

              return e('button', {
                key: clue.text,
                onClick: () => handleSelect(originalIndex),
                className: `h-20 p-2 rounded-xl text-[9px] font-black border-2 transition-all duration-200 flex items-center justify-center text-center uppercase leading-tight
                  ${isFound ? 'opacity-20 grayscale scale-95 border-transparent' : 
                    isSelected ? `${theme.bg} border-white scale-105 z-10 shadow-[0_0_15px_rgba(255,255,255,0.6)]` : 
                    isLoss ? `${theme.bg} opacity-60 border-white/20` :
                    `${theme.bg} border-transparent text-white`}`
              }, clue.text);
            })
          )
        );
      })
    )
  );

  if (view === 'landing') return e('div', {className: 'flex items-center justify-center min-h-screen p-6 text-white text-center'},
    e('div', {className: 'glass p-10 rounded-3xl shadow-2xl max-w-sm w-full border border-white/10'},
      e('h1', {className: 'text-5xl font-black mb-2 tracking-tighter'}, 'GENE-LINK'),
      e('p', {className: 'text-slate-500 text-[10px] uppercase tracking-widest mb-10'}, "Genomic Connection Protocol"),
      e('div', {className: 'flex flex-col gap-3'},
        e('button', {onClick: initGame, className: 'w-full py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-emerald-400 transition-all'}, 'START SESSION'),
        e('button', {onClick: () => setView('how'), className: 'w-full py-4 border border-slate-700 text-slate-300 font-bold rounded-2xl hover:bg-slate-800 text-sm'}, 'HOW TO PLAY'),
        e('button', {onClick: () => setView('bank'), className: 'w-full py-4 border border-slate-700 text-slate-300 font-bold rounded-2xl hover:bg-slate-800 text-sm'}, 'STUDY BANK')
      )
    )
  );

  if (view === 'how') return e('div', {className: 'max-w-md mx-auto p-8 text-white'},
    e('button', {onClick: () => setView('landing'), className: 'mb-8 text-slate-500 font-bold'}, "← BACK"),
    e('h2', {className: 'text-3xl font-black mb-6 uppercase'}, "Manual"),
    e('div', {className: 'space-y-6 text-sm text-slate-300 leading-relaxed'},
        e('p', null, "Link 4 markers to identify a specific diagnosis."),
        e('div', {className: 'space-y-4'},
            e('div', {className: 'flex gap-4 items-center font-bold text-[10px]'}, e('div', {className: 'w-6 h-6 rounded bg-rose-600'}), "GENE"),
            e('div', {className: 'flex gap-4 items-center font-bold text-[10px]'}, e('div', {className: 'w-6 h-6 rounded bg-blue-600'}), "MECHANISM"),
            e('div', {className: 'flex gap-4 items-center font-bold text-[10px]'}, e('div', {className: 'w-6 h-6 rounded bg-purple-600'}), "INHERITANCE"),
            e('div', {className: 'flex gap-4 items-center font-bold text-[10px]'}, e('div', {className: 'w-6 h-6 rounded bg-emerald-600'}), "SYMPTOM")
        ),
        e('p', {className: 'pt-4 border-t border-slate-800'}, "If you fail 4 times, the system will group the correct sequences for your review.")
    )
  );

  if (view === 'bank') return e('div', {className: 'max-w-md mx-auto p-6 text-white'},
    e('button', {onClick: () => setView('landing'), className: 'mb-6 text-sm font-bold text-slate-500'}, "← BACK"),
    e('h2', {className: 'text-3xl font-black mb-8 tracking-tighter uppercase font-mono'}, "Study Bank"),
    e('div', {className: 'space-y-4'},
        unlocked.length === 0 ? e('p', {className: 'text-slate-600 text-center py-20'}, "Decode conditions to unlock data.") :
        unlocked.map((item, i) => e('div', {key: i, className: 'p-6 bg-slate-900/50 border border-slate-800 rounded-3xl'}, 
            e('div', {className: 'text-xl font-black uppercase mb-4 text-white'}, item.name),
            e('div', {className: 'space-y-2'}, item.clues.map((c, ci) => 
                e('div', {key: ci, className: 'flex items-center gap-2 font-mono'}, 
                    e('div', {className: `w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[c.category].bg}`}),
                    e('div', {className: 'text-[9px] text-slate-400 uppercase font-bold'}, `${c.category}: ${c.text}`)
                )
            ))
        ))
    )
  );

  return e('div', {className: 'max-w-md mx-auto p-4 pt-8 text-white'},
    e('header', {className: 'flex justify-between items-center mb-8'},
      e('button', {onClick: () => setView('landing'), className: 'text-xs font-bold text-slate-600 uppercase tracking-tighter'}, "Abort Mission"),
      e('div', {className: 'flex gap-1'}, [...Array(4)].map((_, i) => e('div', {key: i, className: `w-3 h-3 rounded-full border border-slate-800 ${i < mistakes ? 'bg-rose-500 shadow-[0_0_10px_red]' : 'bg-slate-900'}`})))
    ),
    renderGrid(),
    e('div', {className: 'flex flex-col gap-4 items-center'},
      e('div', {className: 'h-4 text-[10px] font-mono tracking-[0.2em] text-emerald-400 uppercase'}, message),
      (isLoss || foundGroups.length === 4) ? 
        e('button', {onClick: initGame, className: 'w-full py-4 bg-white text-slate-950 font-black rounded-2xl shadow-xl hover:bg-emerald-400 transition-colors'}, 'RESTART PROTOCOL') :
        e('button', {onClick: submit, disabled: selected.length !== 4, className: 'w-full py-4 bg-white text-slate-950 font-black rounded-2xl disabled:opacity-20 transition-all shadow-lg'}, 'SEQUENCE'),
      !isLoss && e('button', {onClick: () => setSelected([]), className: 'text-xs font-bold text-slate-600 uppercase'}, "Clear Buffer")
    ),
    showDetail && e('div', {className: 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md'},
        e('div', {className: 'glass p-8 rounded-[40px] max-w-sm w-full border border-white/20 shadow-2xl'},
          e('div', {className: 'text-[10px] text-emerald-400 font-mono mb-2 tracking-widest'}, "DECODING SUCCESSFUL"),
          e('h2', {className: 'text-3xl font-black mb-6 text-white tracking-tighter uppercase leading-none'}, showDetail.name),
          e('div', {className: 'space-y-4 mb-10'},
            showDetail.clues.map((c, idx) => e('div', {key: idx, className: 'flex items-center gap-4'},
              e('div', {className: `w-3 h-3 rounded-full ${CATEGORY_COLORS[c.category].bg}`}),
              e('div', null, 
                  e('div', {className: 'text-[9px] uppercase text-slate-500 font-bold tracking-tighter'}, c.category),
                  e('div', {className: 'text-sm text-slate-100 font-semibold leading-tight'}, c.text)
              )
            ))
          ),
          e('button', {onClick: () => setShowDetail(null), className: 'w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-3xl hover:bg-emerald-400'}, 'CONFIRM')
        )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));