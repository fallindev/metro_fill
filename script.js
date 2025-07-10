document.addEventListener('DOMContentLoaded', () => {
    const bpmInput = document.getElementById('bpm');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const metronomeSound = document.getElementById('metronome-sound');
    const clickFeedback = document.getElementById('click-feedback');
    const currentBeatDisplay = document.getElementById('current-beat');
    const beatsPerBarDisplay = document.getElementById('beats-per-bar');
    const randomCharsOutput = document.getElementById('random-chars-output');

    // UI 요소 참조
    const charsInput = document.getElementById('chars-input');
    const displayLengthInput = document.getElementById('display-length-input');
    const intervalBarsInput = document.getElementById('interval-bars-input');
    const uniqueCharsCheckbox = document.getElementById('unique-chars-checkbox');
    const applySettingsBtn = document.getElementById('apply-settings-btn');
    const voiceSelect = document.getElementById('voice-select');
    const ttsRateInput = document.getElementById('tts-rate-input');
    // --- 추가된 부분 ---
    const enableTtsCheckbox = document.getElementById('enable-tts-checkbox');
    // --- 추가된 부분 끝 ---

    let bpm = parseInt(bpmInput.value);
    let isPlaying = false;
    let metronomeInterval;
    let currentBeat = 0;
    const beatsPerBar = 4;

    let rawCharsInput = charsInput.value;
    let charsToChooseFrom = parseCharsInput(rawCharsInput);

    let displayLength = parseInt(displayLengthInput.value);
    let displayIntervalBars = parseInt(intervalBarsInput.value);
    let useUniqueChars = uniqueCharsCheckbox.checked;
    let currentBar = 0;

    // --- TTS 관련 변수 및 초기화 ---
    let synth = null;
    let voices = [];
    let selectedVoice = null;

    let ttsRate = parseFloat(ttsRateInput.value);
    // --- 추가된 부분 ---
    let enableTts = enableTtsCheckbox.checked; // 음성 출력 여부 초기값
    // --- 추가된 부분 끝 ---
    const TTS_PITCH = 1.0;

    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;

        const populateVoiceList = () => {
            voices = synth.getVoices();
            voiceSelect.innerHTML = '';

            let defaultVoiceIndex = -1;

            voices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;

                if (localStorage.getItem('selectedVoiceName') === voice.name) {
                    option.selected = true;
                    defaultVoiceIndex = index;
                } else if (voice.lang === 'ko-KR' && defaultVoiceIndex === -1) {
                    option.selected = true;
                    defaultVoiceIndex = index;
                }
                voiceSelect.appendChild(option);
            });

            if (defaultVoiceIndex !== -1) {
                selectedVoice = voices[defaultVoiceIndex];
            } else if (voices.length > 0) {
                selectedVoice = voices[0];
                voiceSelect.selectedIndex = 0;
            }
        };

        synth.onvoiceschanged = populateVoiceList;
        populateVoiceList();

        voiceSelect.addEventListener('change', () => {
            const selectedVoiceName = voiceSelect.value;
            selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
            localStorage.setItem('selectedVoiceName', selectedVoiceName);
        });

    } else {
        console.warn("Web Speech API (Speech Synthesis) not supported in this browser.");
        voiceSelect.parentElement.style.display = 'none';
        ttsRateInput.parentElement.style.display = 'none';
        // TTS 미지원 시 음성 출력 체크박스도 숨기기
        enableTtsCheckbox.parentElement.style.display = 'none';
    }
    // --- TTS 관련 끝 ---

    // PWA: 서비스 워커 등록
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }

    function parseCharsInput(inputString) {
        return inputString.split(',').map(char => char.trim()).filter(char => char.length > 0);
    }

    // --- 설정 저장 함수 ---
    function saveSettings() {
        localStorage.setItem('metronomeBpm', bpmInput.value);
        localStorage.setItem('metronomeChars', charsInput.value);
        localStorage.setItem('metronomeDisplayLength', displayLengthInput.value);
        localStorage.setItem('metronomeIntervalBars', intervalBarsInput.value);
        localStorage.setItem('metronomeUniqueChars', uniqueCharsCheckbox.checked);
        if (selectedVoice) {
            localStorage.setItem('selectedVoiceName', selectedVoice.name);
        }
        localStorage.setItem('metronomeTtsRate', ttsRateInput.value);
        // --- 추가된 부분 ---
        localStorage.setItem('metronomeEnableTts', enableTtsCheckbox.checked);
        // --- 추가된 부분 끝 ---
    }

    // --- 설정 로드 함수 ---
    function loadSettings() {
        const savedBpm = localStorage.getItem('metronomeBpm');
        const savedChars = localStorage.getItem('metronomeChars');
        const savedDisplayLength = localStorage.getItem('metronomeDisplayLength');
        const savedIntervalBars = localStorage.getItem('metronomeIntervalBars');
        const savedUniqueChars = localStorage.getItem('metronomeUniqueChars');
        const savedVoiceName = localStorage.getItem('selectedVoiceName');
        const savedTtsRate = localStorage.getItem('metronomeTtsRate');
        // --- 추가된 부분 ---
        const savedEnableTts = localStorage.getItem('metronomeEnableTts');
        // --- 추가된 부분 끝 ---

        if (savedBpm !== null) {
            bpmInput.value = savedBpm;
            bpm = parseInt(savedBpm);
        }
        if (savedChars !== null) {
            charsInput.value = savedChars;
            rawCharsInput = savedChars;
            charsToChooseFrom = parseCharsInput(rawCharsInput);
        }
        if (savedDisplayLength !== null) {
            displayLengthInput.value = savedDisplayLength;
            displayLength = parseInt(savedDisplayLength);
        }
        if (savedIntervalBars !== null) {
            intervalBarsInput.value = savedIntervalBars;
            displayIntervalBars = parseInt(savedIntervalBars);
        }
        if (savedUniqueChars !== null) {
            uniqueCharsCheckbox.checked = (savedUniqueChars === 'true');
            useUniqueChars = (savedUniqueChars === 'true');
        }
        if (savedTtsRate !== null) {
            ttsRateInput.value = savedTtsRate;
            ttsRate = parseFloat(savedTtsRate);
        }
        // --- 추가된 부분 ---
        if (savedEnableTts !== null) {
            enableTtsCheckbox.checked = (savedEnableTts === 'true');
            enableTts = (savedEnableTts === 'true');
            // 음성 출력이 비활성화되어 있다면, 목소리 선택 및 속도 입력 필드를 비활성화
            voiceSelect.disabled = !enableTts;
            ttsRateInput.disabled = !enableTts;
        }
        // --- 추가된 부분 끝 ---

        if (synth && savedVoiceName !== null) {
        }
    }

    // --- 유효성 검사 및 설정 적용 함수 ---
    function validateAndApplySettings() {
        rawCharsInput = charsInput.value;
        charsToChooseFrom = parseCharsInput(rawCharsInput);

        displayLength = parseInt(displayLengthInput.value);
        displayIntervalBars = parseInt(intervalBarsInput.value);
        useUniqueChars = uniqueCharsCheckbox.checked;
        // --- 추가된 부분 ---
        enableTts = enableTtsCheckbox.checked; // 설정 적용 시 음성 출력 여부 업데이트
        // --- 추가된 부분 끝 ---

        const newBpm = parseInt(bpmInput.value);
        if (isNaN(newBpm) || newBpm < parseInt(bpmInput.min) || newBpm > parseInt(bpmInput.max)) {
            alert(`BPM은 ${bpmInput.min}에서 ${bpmInput.max} 사이의 숫자여야 합니다!`);
            bpmInput.value = bpm;
            return false;
        }
        bpm = newBpm;

        if (charsToChooseFrom.length === 0) {
            alert("원본 문자열을 입력해주세요! (쉼표로 구분)");
            return false;
        }

        if (isNaN(displayLength) || displayLength <= 0) {
            alert("표시 길이는 1 이상의 숫자여야 합니다!");
            displayLengthInput.value = 1;
            displayLength = 1;
            return false;
        }

        if (isNaN(displayIntervalBars) || displayIntervalBars <= 0) {
            alert("표시 간격은 1 이상의 숫자여야 합니다!");
            intervalBarsInput.value = 1;
            displayIntervalBars = 1;
            return false;
        }

        if (useUniqueChars && displayLength > charsToChooseFrom.length) {
            alert("중복 없는 문자를 선택한 경우, 표시 길이는 원본 항목의 길이보다 길 수 없습니다. (최대 " + charsToChooseFrom.length + "개)");
            displayLengthInput.value = charsToChooseFrom.length;
            displayLength = charsToChooseFrom.length;
            return false;
        }

        const newTtsRate = parseFloat(ttsRateInput.value);
        if (isNaN(newTtsRate) || newTtsRate < parseFloat(ttsRateInput.min) || newTtsRate > parseFloat(ttsRateInput.max)) {
            alert(`발음 속도는 ${ttsRateInput.min}에서 ${ttsRateInput.max} 사이의 숫자여야 합니다!`);
            ttsRateInput.value = ttsRate;
            return false;
        }
        ttsRate = newTtsRate;

        // --- 추가된 부분: 음성 출력 여부에 따라 목소리 선택/속도 입력 필드 비활성화/활성화 ---
        voiceSelect.disabled = !enableTts;
        ttsRateInput.disabled = !enableTts;
        // --- 추가된 부분 끝 ---

        saveSettings();
        return true;
    }

    bpmInput.addEventListener('input', () => {
        const newBpm = parseInt(bpmInput.value);
        if (!isNaN(newBpm) && newBpm >= parseInt(bpmInput.min) && newBpm <= parseInt(bpmInput.max)) {
            bpm = newBpm;
            saveSettings();
            if (isPlaying) {
                stopMetronome();
                startMetronome();
            }
        }
    });

    charsInput.addEventListener('input', () => {
        saveSettings();
        rawCharsInput = charsInput.value;
        charsToChooseFrom = parseCharsInput(rawCharsInput);
    });

    displayLengthInput.addEventListener('input', saveSettings);
    intervalBarsInput.addEventListener('input', saveSettings);
    uniqueCharsCheckbox.addEventListener('change', saveSettings);
    ttsRateInput.addEventListener('input', saveSettings);
    // --- 추가된 부분 ---
    enableTtsCheckbox.addEventListener('change', () => {
        enableTts = enableTtsCheckbox.checked; // 체크박스 변경 시 enableTts 변수 업데이트
        voiceSelect.disabled = !enableTts; // 목소리 선택 드롭다운 활성화/비활성화
        ttsRateInput.disabled = !enableTts; // TTS 속도 입력 필드 활성화/비활성화
        saveSettings(); // 설정 저장
        if (!enableTts && synth && synth.speaking) { // TTS 비활성화 시 현재 발음 중인 것이 있다면 중단
            synth.cancel();
        }
    });
    // --- 추가된 부분 끝 ---

    applySettingsBtn.addEventListener('click', () => {
        if (validateAndApplySettings()) {
            if (isPlaying) {
                stopMetronome();
                startMetronome();
            }
            alert("설정이 적용되었습니다!");
        }
    });

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            stopMetronome();
        } else {
            if (validateAndApplySettings()) {
                startMetronome();
            }
        }
    });

    // 랜덤 문자열 생성 및 표시 함수 (순열 로직 포함)
    function generateAndDisplayRandomString() {
        if (charsToChooseFrom.length === 0) {
            randomCharsOutput.textContent = "문자열 없음";
            // --- 변경된 부분 ---
            if (synth && synth.speaking) synth.cancel();
            // --- 변경된 부분 끝 ---
            return;
        }

        let generatedItems = [];
        if (useUniqueChars) {
            if (displayLength > charsToChooseFrom.length) {
                randomCharsOutput.textContent = "오류: 원본 항목 부족";
                console.error("Error: Not enough unique items in source for desired display length.");
                // --- 변경된 부분 ---
                if (synth && synth.speaking) synth.cancel();
                // --- 변경된 부분 끝 ---
                return;
            }

            let sourceArray = [...charsToChooseFrom];
            let result = [];

            for (let i = 0; i < displayLength; i++) {
                const randomIndex = Math.floor(Math.random() * sourceArray.length);
                result.push(sourceArray[randomIndex]);
                sourceArray.splice(randomIndex, 1);
            }
            generatedItems = result;
        } else {
            for (let i = 0; i < displayLength; i++) {
                const randomIndex = Math.floor(Math.random() * charsToChooseFrom.length);
                generatedItems.push(charsToChooseFrom[randomIndex]);
            }
        }
        randomCharsOutput.textContent = generatedItems.join(', ');

        // --- 변경된 부분: enableTts 여부에 따라 TTS 실행 ---
        if (enableTts && synth && generatedItems.length > 0) {
            if (synth.speaking) {
                synth.cancel();
            }

            let textToSpeak = generatedItems.join('. ');

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'ko-KR';

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            } else if (voices.length > 0) {
                utterance.voice = voices[0];
            }

            utterance.rate = ttsRate;
            utterance.pitch = TTS_PITCH;

            synth.speak(utterance);
        } else if (!enableTts && synth && synth.speaking) { // TTS 비활성화 시 현재 발음 중인 것 중단
             synth.cancel();
        }
        // --- 변경된 부분 끝 ---
    }

    // 메트로놈 시작 함수
    function startMetronome() {
        isPlaying = true;
        playPauseBtn.textContent = '정지';
        const intervalTime = (60 / bpm) * 1000;

        currentBeat = 0;
        currentBar = 0;
        currentBeatDisplay.textContent = currentBeat;
        beatsPerBarDisplay.textContent = beatsPerBar;

        generateAndDisplayRandomString();

        if (typeof AudioContext !== 'undefined') {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            let oscillator = null;

            function playClick() {
                if (oscillator) {
                    oscillator.stop();
                    oscillator.disconnect();
                }

                oscillator = audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

                const gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.05);

                clickFeedback.classList.add('active');
                setTimeout(() => {
                    clickFeedback.classList.remove('active');
                }, 50);

                currentBeat++;
                if (currentBeat > beatsPerBar) {
                    currentBeat = 1;
                    currentBar++;
                    if (currentBar % displayIntervalBars === 0) {
                        generateAndDisplayRandomString();
                    }
                }
                currentBeatDisplay.textContent = currentBeat;
            }

            metronomeInterval = setInterval(playClick, intervalTime);

        } else {
            metronomeInterval = setInterval(() => {
                metronomeSound.currentTime = 0;
                metronomeSound.play();
                clickFeedback.classList.add('active');
                setTimeout(() => {
                    clickFeedback.classList.remove('active');
                }, 50);

                currentBeat++;
                if (currentBeat > beatsPerBar) {
                    currentBeat = 1;
                    currentBar++;
                    if (currentBar % displayIntervalBars === 0) {
                        generateAndDisplayRandomString();
                    }
                }
                currentBeatDisplay.textContent = currentBeat;
            }, intervalTime);
        }
    }

    // 메트로놈 정지 함수
    function stopMetronome() {
        isPlaying = false;
        playPauseBtn.textContent = '재생';
        clearInterval(metronomeInterval);
        clickFeedback.classList.remove('active');
        currentBeat = 0;
        currentBar = 0;
        currentBeatDisplay.textContent = currentBeat;
        randomCharsOutput.textContent = '';
        if (synth && synth.speaking) {
            synth.cancel();
        }
    }

    // 초기 설정 로드
    loadSettings();
    currentBeatDisplay.textContent = currentBeat;
    beatsPerBarDisplay.textContent = beatsPerBar;
});