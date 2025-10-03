/*
 * main.js
 * This file contains the core logic for the listening experiment application.
 */

// --- Configuration ---
const DATA_FILE_PATH = 'data/sentence.json';
const REPEAT_LIMIT = 5; // Set to null for unlimited repeats

// --- State Management ---
const appState = {
    participantId: '',
    currentTrialIndex: 0,
    userResponses: [],
    trialStartTime: null,
    repeatCount: 0,
    isExperimentRunning: false, // ★ SAFETY IMPROVEMENT: Flag to track if the experiment is active.
};

let trials = [];
let practiceTrialsCount = 0;
const appContainer = document.getElementById('app');
const audioPlayer = new Audio();

// ★ SAFETY IMPROVEMENT: Warn user before leaving the page during the experiment.
window.addEventListener('beforeunload', (event) => {
    if (appState.isExperimentRunning) {
        event.preventDefault();
        event.returnValue = ''; // Standard for most browsers
    }
});


// --- Helper Functions ---
function transitionTo(renderFn) {
    appContainer.style.opacity = '0';
    setTimeout(() => {
        renderFn();
        appContainer.style.opacity = '1';
        appContainer.style.transition = 'opacity 0.3s ease-in-out';
    }, 200);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Render Functions ---

function renderLoadingScreen() {
    appContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8">
            <div class="loader mb-4"></div>
            <p class="text-slate-500">実験データを読み込んでいます...</p>
        </div>`;
}

function renderErrorScreen(message) {
    appContainer.innerHTML = `
        <div class="text-center p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <h2 class="font-bold">致命的なエラー</h2>
            <p>${message}</p>
            <p class="text-sm mt-2">ローカルサーバーが起動しているか、または ${DATA_FILE_PATH} のパスや内容を確認してください。</p>
        </div>`;
}

function renderParticipantIdScreen() {
    appContainer.innerHTML = `
        <div class="text-center">
            <h1 class="text-3xl font-bold text-slate-800 mb-4">実験参加者の登録</h1>
            <p class="text-slate-600 mb-8">被験者IDを入力してください。</p>
            <div class="max-w-sm mx-auto">
                <input type="text" id="participant-id-input" class="bg-gray-50 border border-gray-300 text-slate-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 text-center" placeholder="例：P01">
            </div>
            <button id="start-intro-btn" class="mt-8 w-full max-w-sm bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-opacity duration-300 opacity-50 cursor-not-allowed" disabled>
                入力して次へ
            </button>
        </div>
    `;

    const idInput = document.getElementById('participant-id-input');
    const startBtn = document.getElementById('start-intro-btn');
    idInput.focus();

    idInput.addEventListener('input', () => {
        if (idInput.value.trim()) {
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            startBtn.disabled = true;
            startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    
    // ★ SAFETY IMPROVEMENT: Removed Enter key submission for consistency and to prevent mistakes.
    // idInput.addEventListener('keydown', (e) => {
    //     if (e.key === 'Enter' && !startBtn.disabled) {
    //         startBtn.click();
    //     }
    // });

    startBtn.addEventListener('click', () => {
        appState.participantId = idInput.value.trim();
        transitionTo(renderIntroScreen);
    });
}

function renderIntroScreen() {
    const mainTrialsCount = trials.length - practiceTrialsCount;
    const hasPractice = practiceTrialsCount > 0;
    appContainer.innerHTML = `
        <div class="text-center">
            <h1 class="text-3xl font-bold text-slate-800 mb-4">聴取実験へようこそ</h1>
            <div class="text-left space-y-4 text-slate-600">
                <p>この実験は、音声がどのように聞き取られるかを調べるものです。</p>
                <!-- ★ WORDING CHANGE -->
                <p>各課題が始ると、自動的に音声が一度再生されます。聞こえた通りに入力し、その後表示される「話者が意図した文章」と比較して、聞こえ方を5段階で評価してください。</p>
                ${hasPractice ? `<p>まず、操作に慣れるための練習課題が${practiceTrialsCount}問あります。その後、本番課題が${mainTrialsCount}問あります。</p>` : ''}
                <div class="bg-slate-50 p-4 rounded-lg border">
                    <h2 class="font-bold text-lg mb-2">実験の流れ</h2>
                    <ol class="list-decimal list-inside space-y-1">
                        <li>静かな環境で、ヘッドホンを使用してご参加ください。</li>
                        <li>課題が始ると音声が自動再生されます。</li>
                        <li>聞こえた通りにテキストボックスに入力します。</li>
                        <!-- ★ WORDING CHANGE -->
                        <li>「回答を確定」ボタンを押すと、話者が意図した文章が表示されます。</li>
                        <li>表示された文章を参考に、聞こえ方を5段階で評価してください。</li>
                    </ol>
                </div>
            </div>
            <button id="start-btn" class="mt-8 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105">
                実験を開始する
            </button>
        </div>
    `;
    document.getElementById('start-btn').addEventListener('click', startExperiment);
}

function renderTransitionScreen() {
    appContainer.innerHTML = `
        <div class="text-center">
            <h1 class="text-2xl font-bold text-slate-800 mb-4">練習終了</h1>
            <p class="text-slate-600 mb-8">お疲れ様でした。これで練習は終わりです。<br>次から本番の課題が始まります。</p>
            <button id="start-main-btn" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-lg">
                本番を開始する
            </button>
        </div>
    `;
    document.getElementById('start-main-btn').addEventListener('click', () => transitionTo(renderTaskScreen));
}

function renderTaskScreen() {
    if (appState.currentTrialIndex >= trials.length) {
        transitionTo(renderEndScreen);
        return;
    }

    appState.trialStartTime = Date.now();
    appState.repeatCount = 0;
    const trial = trials[appState.currentTrialIndex];
    const isPractice = appState.currentTrialIndex < practiceTrialsCount;
    
    let progressPercentage, progressText, progressLabel;
    if (isPractice) {
        const currentPracticeIndex = appState.currentTrialIndex + 1;
        progressPercentage = (currentPracticeIndex / practiceTrialsCount) * 100;
        progressText = `${currentPracticeIndex} / ${practiceTrialsCount}`;
        progressLabel = '練習';
    } else {
        const mainTrialsCount = trials.length - practiceTrialsCount;
        const currentMainIndex = appState.currentTrialIndex - practiceTrialsCount + 1;
        progressPercentage = (currentMainIndex / mainTrialsCount) * 100;
        progressText = `${currentMainIndex} / ${mainTrialsCount}`;
        progressLabel = '本番';
    }

    appContainer.innerHTML = `
        <div>
            <div class="mb-6">
                <div class="flex justify-between mb-2 items-center">
                    <span class="text-base font-medium text-blue-700">${progressLabel}</span>
                    <span class="text-sm font-medium text-blue-700">${progressText}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
            <h2 class="text-2xl font-bold text-slate-800 mb-4 text-center">課題 ${isPractice ? `練習 ${appState.currentTrialIndex + 1}`: `本番 ${appState.currentTrialIndex - practiceTrialsCount + 1}`}</h2>
            <p id="audio-status" class="text-center text-slate-500 h-6 mb-4">音声を再生します...</p>
            <div class="flex items-center justify-center space-x-4 my-6">
                <button id="repeat-btn" class="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded-full flex items-center space-x-2 text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path></svg>
                    <span>もう一度聞く (<span id="repeat-count">0</span>${REPEAT_LIMIT !== null ? `/${REPEAT_LIMIT}` : ''})</span>
                </button>
            </div>
            <div class="mt-6">
                <label for="transcription-input" class="block mb-2 text-lg font-medium text-slate-700">聞こえた通りに入力してください:</label>
                <input type="text" id="transcription-input" class="bg-gray-50 border border-gray-300 text-slate-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3" placeholder="例：おはよう">
            </div>
            <button id="submit-transcription-btn" class="mt-8 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg">
                回答を確定して評価へ進む
            </button>
        </div>
    `;
    
    attachAudioEventListeners();
    const submitBtn = document.getElementById('submit-transcription-btn');
    submitBtn.addEventListener('click', showAnswerAndEvaluation);
    
    const transcriptionInput = document.getElementById('transcription-input');
    transcriptionInput.focus();

    setTimeout(() => {
        audioPlayer.play().catch(e => {
            console.error("Autoplay failed:", e);
            const statusEl = document.getElementById('audio-status');
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-red-500 font-semibold">音声の自動再生に失敗しました。「もう一度聞く」ボタンを押してください。</span>`;
            }
        });
    }, 500);
}

function showAnswerAndEvaluation() {
    const transcriptionInput = document.getElementById('transcription-input');
    if (!transcriptionInput.value.trim()) {
        alert('回答を入力してください。');
        return;
    }

    const trial = trials[appState.currentTrialIndex];
    appState.userResponses.push({ id: trial.id, sentence: trial.sentence, transcription: transcriptionInput.value.trim(), ratings: {} });
    
    let evaluationHTML = `
        <div class="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <!-- ★ WORDING CHANGE -->
            <p class="text-center text-slate-600">話者が意図した文章は…</p>
            <p class="text-center text-3xl font-bold text-green-700 tracking-widest">${trial.sentence}</p>
        </div>
        <div class="mt-8">
            <h3 class="text-xl font-bold text-slate-800 mb-2">一致度の評価</h3>
            <p class="text-slate-600 mb-6 text-center bg-slate-50 p-2 rounded-md">「1: 全くそう聞こえない」～「5: 完全にそう聞こえる」の5段階で評価してください。</p>
            <div class="space-y-6" id="evaluation-form">
    `;
    
    const ratingButtons = (name) => [1,2,3,4,5].map(i => `<button type="button" class="rating-point" data-value="${i}" data-name="${name}">${i}</button>`).join('');
    trial.phonemes.forEach((phoneme, index) => {
        const name = `phoneme_${index}`;
        evaluationHTML += `
            <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-2">
                <label class="md:col-span-1 text-xl font-mono text-center text-slate-700">${phoneme}</label>
                <div class="md:col-span-2 flex justify-between items-center w-full max-w-xs mx-auto">
                   <span class="text-xs text-slate-500 hidden md:block">全く</span>
                   <div class="flex-grow flex justify-center space-x-1 sm:space-x-2">${ratingButtons(name)}</div>
                   <span class="text-xs text-slate-500 hidden md:block">完全</span>
                </div>
            </div>`;
    });
    evaluationHTML += `
        <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-2 pt-4 border-t mt-6">
            <label class="md:col-span-1 text-lg font-bold text-center text-slate-700">全体</label>
            <div class="md:col-span-2 flex justify-between items-center w-full max-w-xs mx-auto">
                <span class="text-xs text-slate-500 hidden md:block">全く</span>
                <div class="flex-grow flex justify-center space-x-1 sm:space-x-2">${ratingButtons('overall')}</div>
                <span class="text-xs text-slate-500 hidden md:block">完全</span>
            </div>
        </div>
    </div></div>
        <button id="next-btn" class="mt-8 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-lg">次へ</button>`;

    appContainer.querySelector('#submit-transcription-btn').remove();
    appContainer.querySelector('div').insertAdjacentHTML('beforeend', evaluationHTML);
    transcriptionInput.disabled = true;
    document.getElementById('repeat-btn').disabled = false;

    document.getElementById('evaluation-form').addEventListener('click', (e) => {
        if (e.target.classList.contains('rating-point')) {
            const button = e.target;
            const groupContainer = button.parentElement;
            groupContainer.querySelectorAll('.rating-point').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
        }
    });
    document.getElementById('next-btn').addEventListener('click', moveToNextTrial);
}

function downloadData() {
    const dataToSave = {
        participantId: appState.participantId,
        experimentDate: new Date().toISOString(),
        responses: appState.userResponses
    };
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.download = `data_${appState.participantId}_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function renderEndScreen() {
    appState.isExperimentRunning = false; // ★ SAFETY IMPROVEMENT: Mark experiment as finished.
    const totalTrials = appState.userResponses.length;
    const totalDuration = appState.userResponses.reduce((acc, res) => acc + (res.duration || 0), 0);
    const avgDuration = totalTrials > 0 ? (totalDuration / totalTrials).toFixed(1) : 0;
    const finalDataString = JSON.stringify({
        participantId: appState.participantId,
        experimentDate: new Date().toISOString(),
        responses: appState.userResponses
    }, null, 2);

    appContainer.innerHTML = `
        <div class="text-center">
            <h1 class="text-3xl font-bold text-slate-800 mb-4">実験終了</h1>
            <p class="text-lg text-slate-600 mb-8">ご協力いただき、誠にありがとうございました。</p>
            <div class="bg-slate-50 p-6 rounded-lg border text-left space-y-3">
                <h2 class="text-xl font-semibold text-slate-700 mb-3">実験結果の概要</h2>
                <div class="flex justify-between"><span>被験者ID:</span><span class="font-mono font-bold">${appState.participantId}</span></div>
                <div class="flex justify-between"><span>回答数:</span><span>${totalTrials - practiceTrialsCount} 件 (本番)</span></div>
                <div class="flex justify-between"><span>1課題あたりの平均所要時間:</span><span>${avgDuration} 秒</span></div>
            </div>
            <p class="text-sm text-slate-500 mt-8">この実験で得られた結果は、音声の聴取特性を明らかにし、今後のコミュニケーション支援ツールの改善に役立てられます。</p>
            <div id="end-buttons" class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button id="download-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg">結果をダウンロード</button>
                <button id="restart-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg">別のIDで再開する</button>
            </div>
            
            <!-- ★ SAFETY IMPROVEMENT: Collapsible text area for data backup -->
            <div class="mt-6 text-left">
                <details class="bg-slate-50 rounded-lg border">
                    <summary class="cursor-pointer p-3 font-semibold text-slate-700">結果データ（バックアップ用）</summary>
                    <div class="p-3 border-t">
                        <textarea readonly class="w-full h-48 p-2 text-xs font-mono bg-white border border-slate-300 rounded-md">${finalDataString}</textarea>
                        <p class="text-xs text-slate-500 mt-1">ダウンロードに失敗した場合は、この内容をコピーしてテキストファイルに保存してください。</p>
                    </div>
                </details>
            </div>
        </div>
    `;
    document.getElementById('download-btn').addEventListener('click', downloadData);
    document.getElementById('restart-btn').addEventListener('click', confirmAndRestart);
}

// --- Event Handlers & Logic ---

function startExperiment() {
    appState.isExperimentRunning = true; // ★ SAFETY IMPROVEMENT: Mark experiment as started.
    appState.currentTrialIndex = 0; 
    appState.userResponses = []; 
    transitionTo(renderTaskScreen);
}

function attachAudioEventListeners() {
    const repeatBtn = document.getElementById('repeat-btn');
    const repeatCountSpan = document.getElementById('repeat-count');
    const statusEl = document.getElementById('audio-status');
    const trial = trials[appState.currentTrialIndex];
    audioPlayer.src = trial.audio;

    repeatBtn.addEventListener('click', () => {
        if (REPEAT_LIMIT !== null && appState.repeatCount >= REPEAT_LIMIT) { 
            alert(`リピートは${REPEAT_LIMIT}回までです。`); 
            return; 
        }
        appState.repeatCount++;
        if(repeatCountSpan) repeatCountSpan.textContent = appState.repeatCount;
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        if (REPEAT_LIMIT !== null && appState.repeatCount >= REPEAT_LIMIT) {
            repeatBtn.disabled = true;
            repeatBtn.classList.replace('bg-sky-500', 'bg-gray-400');
            repeatBtn.classList.replace('hover:bg-sky-600', 'cursor-not-allowed');
        }
    });

    audioPlayer.addEventListener('play', () => {
        repeatBtn.classList.add('playing');
        if (statusEl) statusEl.textContent = '再生中...';
    });
    audioPlayer.addEventListener('pause', () => repeatBtn.classList.remove('playing'));
    audioPlayer.addEventListener('ended', () => {
        repeatBtn.classList.remove('playing');
        if (statusEl) statusEl.textContent = '音声を聞いて入力してください。';
    });
    audioPlayer.onerror = () => renderErrorScreen(`音声ファイルが見つかりません: <code>${trial.audio}</code>`);
}

function moveToNextTrial() {
    const trial = trials[appState.currentTrialIndex];
    const currentResponse = appState.userResponses[appState.currentTrialIndex];
    currentResponse.duration = (Date.now() - appState.trialStartTime) / 1000;
    
    let allRated = true;
    const evaluationForm = document.getElementById('evaluation-form');
    trial.phonemes.forEach((phoneme, index) => {
        const name = `phoneme_${index}`;
        const selectedButton = evaluationForm.querySelector(`.rating-point[data-name="${name}"].selected`);
        if (selectedButton) {
            currentResponse.ratings[phoneme] = parseInt(selectedButton.dataset.value, 10);
        } else { allRated = false; }
    });
    
    const overallButton = evaluationForm.querySelector(`.rating-point[data-name="overall"].selected`);
    if (overallButton) {
        currentResponse.ratings.overall = parseInt(overallButton.dataset.value, 10);
    } else { allRated = false; }

    if (!allRated) {
        alert('すべての項目を評価してください。');
        return;
    }
    
    console.log(`Trial ${appState.currentTrialIndex + 1} Result:`, JSON.parse(JSON.stringify(currentResponse)));
    
    const isLastPractice = appState.currentTrialIndex === practiceTrialsCount - 1;
    const areTrialsRemaining = appState.currentTrialIndex < trials.length - 1;
    appState.currentTrialIndex++;

    if (isLastPractice && areTrialsRemaining) {
        transitionTo(renderTransitionScreen);
    } else {
        transitionTo(renderTaskScreen);
    }
}

function confirmAndRestart() {
    const endButtonsContainer = document.getElementById('end-buttons');
    endButtonsContainer.innerHTML = `
        <div class="md:col-span-2 text-center p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p class="font-semibold text-yellow-800">本当に再開しますか？<br><span class="text-sm">現在の結果は保存されません。</span></p>
            <div class="mt-2 flex justify-center gap-4">
                 <button id="confirm-restart-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg">はい</button>
                 <button id="cancel-restart-btn" class="bg-slate-400 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">いいえ</button>
            </div>
        </div>
    `;
    document.getElementById('confirm-restart-btn').addEventListener('click', init);
    document.getElementById('cancel-restart-btn').addEventListener('click', () => transitionTo(renderEndScreen));
}

// --- Initialization ---
async function init() {
    renderLoadingScreen();
    // Reset state
    Object.assign(appState, { participantId: '', currentTrialIndex: 0, userResponses: [], trialStartTime: null, repeatCount: 0, isExperimentRunning: false });

    try {
        const response = await fetch(DATA_FILE_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.practice || !data.main) throw new Error('実験データに practice または main のキーが見つかりません。');
        
        const mainTrials = [...data.main];
        shuffleArray(mainTrials); // Randomize main trials
        
        practiceTrialsCount = data.practice.length;
        trials = [...data.practice, ...mainTrials];
        
        if (trials.length === 0) throw new Error('実験データが空です。');
        
        setTimeout(() => transitionTo(renderParticipantIdScreen), 300);

    } catch (error) {
        console.error("Failed to initialize experiment:", error);
        renderErrorScreen(error.message);
    }
}
        
// Start the application
init();

