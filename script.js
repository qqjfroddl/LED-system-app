// Supabase 초기화
// TODO: Supabase 프로젝트 생성 후 아래 값을 실제 값으로 변경하세요
const SUPABASE_URL = 'https://faeoveodareburrulgqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZW92ZW9kYXJlYnVycnVsZ3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODU3NTUsImV4cCI6MjA3ODg2MTc1NX0.7fxmJQaJrpJqkBM5wtCqWi8D_wEDqgbxXzPpw6Y9DEM';  // Supabase Dashboard의 API 키

// EmailJS 설정
// TODO: EmailJS 계정 생성 후 아래 값을 실제 값으로 변경하세요
// https://www.emailjs.com 에서 무료 계정 생성
const EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';  // EmailJS Service ID
const EMAILJS_TEMPLATE_ID_USER = 'YOUR_EMAILJS_TEMPLATE_ID_USER';  // 사용자용 템플릿 ID
const EMAILJS_TEMPLATE_ID_ADMIN = 'YOUR_EMAILJS_TEMPLATE_ID_ADMIN';  // 관리자용 템플릿 ID
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';  // EmailJS Public Key
const ADMIN_EMAIL = 'ledhelper@daum.net';  // 관리자 이메일

// 제미나이 API 설정
// TODO: Google AI Studio (https://aistudio.google.com/)에서 API 키 발급 후 아래 값을 변경하세요
const GEMINI_API_KEY = 'AIzaSyDgSu1uDcSIGFur3lCfs22vL_p2PjDUDzA';  // Gemini API 키
// 사용 가능한 모델을 자동으로 찾아서 사용
let cachedGeminiModel = null;

let supabase = null;

// Supabase 클라이언트 초기화
if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase 연결됨');
} else {
    console.warn('⚠️ Supabase가 설정되지 않았습니다. 로컬스토리지 모드로 동작합니다.');
}

// 전역 상태 관리
let appState = {
    currentTab: 'today',
    currentDate: new Date(),
    allData: {},
    newTask: '',
    selectedCategory: 'work',
    showReflection: false,
    showCalendar: false,
    monthlyRoutines: {},
    editingRoutines: ['', '', ''],
    yearlyGoals: {},
    monthlyPlans: {},
    editingYearlyGoals: { selfDev: '', relationship: '', workFinance: '' },
    editingMonthlyPlans: { selfDev: '', relationship: '', workFinance: '' },
    selectedYear: new Date().getFullYear(),
    showCopyDialog: false,
    yearToCopy: null,
    calendarDate: new Date(), // 캘린더에서 표시할 날짜
    user: null, // 사용자 정보
    editingTaskId: null, // 수정 중인 할일 ID
    realtimeChannels: [], // 실시간 동기화 채널들
    saveTimer: null, // 자동저장 타이머
    // 타이머 상태
    timerState: {
        isRunning: false,
        isPaused: false,
        totalSeconds: 0,
        remainingSeconds: 0,
        totalFocusedMinutes: 0, // 총 집중한 시간 (분)
        timerInterval: null
    }
};

// 카테고리 설정
const categories = {
    work: { name: 'Work', color: 'bg-yellow-400', icon: '<i data-lucide="briefcase"></i>', desc: '복잡하고 어려운 일' },
    job: { name: 'Job', color: 'bg-cyan-400', icon: '<i data-lucide="check"></i>', desc: '간단한 할일' },
    routine: { name: '자기계발', color: 'bg-purple-400', icon: '<i data-lucide="book"></i>', desc: '성장과 관련된 내용' },
    personal: { name: 'Personal', color: 'bg-pink-400', icon: '<i data-lucide="home"></i>', desc: '개인적인 삶' }
};

// JWT 토큰 디코딩 함수 (Google Sign-In용)
const decodeJwtPayload = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
};

// Google Sign-In 콜백 함수 (Google Sign-In 스크립트가 로드되기 전에 미리 선언)
// 반드시 전역 스코프에 정의되어야 하며, 스크립트 로드 전에 존재해야 함
if (typeof window.handleCredentialResponse === 'undefined') {
    window.handleCredentialResponse = async function(response) {
    console.log('🔵 ========== Google Sign-In 콜백 호출됨 ==========');
    console.log('📋 응답 데이터:', response);
    console.log('🌐 현재 URL:', window.location.href);
    console.log('🔑 클라이언트 ID:', '646863604089-a5smqvgvgi5hp584dafuprjf5oa3jucf.apps.googleusercontent.com');
    
    if (!response || !response.credential) {
        console.error('❌ 응답에 credential이 없습니다:', response);
        alert('로그인 응답이 올바르지 않습니다. 다시 시도해주세요.');
        return;
    }
    
    try {
        // JWT 토큰을 디코딩하여 사용자 정보 추출
        const payload = JSON.parse(decodeJwtPayload(response.credential));
        console.log('✅ 사용자 정보 디코딩 완료:', payload.name);
        
        // Supabase 모드인 경우
        if (typeof supabase !== 'undefined' && supabase) {
            try {
                // 1. Supabase에 사용자 등록/확인
                const { data: existingUser, error: selectError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', payload.sub)
                    .single();
                
                let user = existingUser;
                
                // 사용자가 없으면 신규 등록
                if (!existingUser) {
                    const { data: newUser, error: insertError } = await supabase
                        .from('users')
                        .insert({
                            id: payload.sub,
                            email: payload.email,
                            name: payload.name,
                            picture: payload.picture,
                            is_approved: false,
                            requested_at: new Date().toISOString(),
                            role: 'user'
                        })
                        .select()
                        .single();
                    
                    if (insertError) {
                        console.error('사용자 등록 실패:', insertError);
                        alert('회원가입 중 오류가 발생했습니다.');
                        return;
                    }
                    
                    user = newUser;
                    
                    // 신규 사용자 등록 시 이메일 알림 발송
                    try {
                        if (typeof sendUserRegistrationEmails === 'function') {
                            await sendUserRegistrationEmails({
                                userName: payload.name,
                                userEmail: payload.email,
                                requestedAt: new Date().toLocaleString('ko-KR')
                            });
                            console.log('✅ 이메일 알림 발송 완료');
                        }
                    } catch (emailError) {
                        console.error('⚠️ 이메일 발송 실패 (앱은 정상 작동):', emailError);
                    }
                }
                
                // 2. 승인 여부 확인
                if (!user.is_approved) {
                    alert('✋ 계정 승인 대기 중입니다.\n\n관리자가 승인하면 사용 가능합니다.\n보통 24시간 이내에 처리됩니다.\n\n문의: admin@example.com');
                    if (typeof logout === 'function') {
                        logout();
                    }
                    return;
                }
                
                // 3. 승인된 사용자 - 정상 로그인
                appState.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    picture: user.picture,
                    role: user.role
                };
                
                // 4. Supabase에서 데이터 로드
                if (typeof loadUserDataFromSupabase === 'function') {
                    await loadUserDataFromSupabase(user.id);
                }
                if (typeof updateUserInterface === 'function') {
                    updateUserInterface();
                }
                if (typeof renderCurrentTab === 'function') {
                    renderCurrentTab();
                }
                
                // 로그인 후 어제 미완료 할일 확인
                setTimeout(() => {
                    if (typeof checkYesterdayIncompleteTasks === 'function') {
                        checkYesterdayIncompleteTasks();
                    }
                }, 300);
                
                console.log('✅ 로그인 성공:', appState.user);
                
            } catch (error) {
                console.error('❌ 로그인 실패:', error);
                alert('로그인 중 오류가 발생했습니다: ' + error.message);
            }
        } else {
            // 로컬스토리지 모드 (기존 방식)
            appState.user = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture
            };
            
            const userDataKey = `user_${appState.user.id}`;
            if (typeof loadUserData === 'function') {
                loadUserData(userDataKey);
            }
            if (typeof updateUserInterface === 'function') {
                updateUserInterface();
            }
            if (typeof renderCurrentTab === 'function') {
                renderCurrentTab();
            }
            
            // 로그인 후 어제 미완료 할일 확인
            setTimeout(() => {
                if (typeof checkYesterdayIncompleteTasks === 'function') {
                    checkYesterdayIncompleteTasks();
                }
            }, 300);
            
            console.log('✅ 로그인 성공 (로컬모드):', appState.user);
        }
    } catch (error) {
        console.error('❌ 로그인 처리 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다: ' + error.message);
    }
    };
    } // if (typeof window.handleCredentialResponse === 'undefined') 닫기

// 유틸리티 함수들
// 로컬 시간 기준으로 날짜 포맷팅 (UTC 대신 한국 시간 사용)
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDateKey = () => formatDate(appState.currentDate);

// Tasks merge 함수 (id 기준으로 병합)
const mergeTasks = (remoteTasks = [], localTasks = []) => {
    const map = new Map();
    // 원격 데이터 먼저
    for (const t of remoteTasks) map.set(t.id, t);
    // 로컬 데이터로 덮어쓰기 (로컬 우선)
    for (const t of localTasks) {
        const prev = map.get(t.id) || {};
        map.set(t.id, { ...prev, ...t });
    }
    return [...map.values()];
};

// 일별 데이터 merge (충돌 방지)
const mergeDayData = (remote = {}, local = {}) => {
    return {
        ...remote,
        ...local,
        tasks: mergeTasks(remote.tasks || [], local.tasks || []),
        routines: local.routines || remote.routines || [],
        reflection: local.reflection || remote.reflection || { grateful: '', wellDone: '', regret: '' }
    };
};

// 자동저장 스케줄링 (debounce)
const scheduleAutosave = () => {
    if (appState.saveTimer) {
        clearTimeout(appState.saveTimer);
    }
    appState.saveTimer = setTimeout(async () => {
        console.log('⏰ 자동저장 실행');
        await saveToLocalStorage();
    }, 600); // 0.6초 후 저장
};

const getMonthlyRoutinesForDate = (date) => {
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return appState.monthlyRoutines[monthKey] || [
        { id: 1, name: '아침 명상 10분' },
        { id: 2, name: '운동 30분' },
        { id: 3, name: '독서 20분' }
    ];
};

const getDataForDate = (date) => {
    const dateKey = formatDate(date);
    const existingData = appState.allData[dateKey];
    if (existingData) return existingData;
    
    const monthlyRoutinesList = getMonthlyRoutinesForDate(date);
    const defaultRoutines = monthlyRoutinesList.map(r => ({ ...r, completed: false }));
    return {
        tasks: [],
        routines: defaultRoutines,
        reflection: { grateful: '', wellDone: '', regret: '' }
    };
};

const getCurrentData = () => getDataForDate(appState.currentDate);

// 로컬스토리지 또는 Supabase에 저장 (실시간 저장 보장)
const saveToLocalStorage = async () => {
    try {
        console.log('💾 저장 시작:', {
            사용자: appState.user ? appState.user.name : '로그인 안함',
            Supabase연결: !!supabase,
            데이터개수: Object.keys(appState.allData).length
        });
        
        if (appState.user && supabase) {
            // Supabase에 실시간 저장 (await로 완료 대기)
            await saveToSupabase();
            
            // Supabase 저장 성공 후 로컬스토리지에도 백업 저장
            const userDataKey = `user_${appState.user.id}`;
            saveUserData(userDataKey);
            
            console.log('✅ Supabase + 로컬스토리지 저장 완료');
            
        } else if (appState.user) {
            // 로컬스토리지에 사용자별로 저장
            const userDataKey = `user_${appState.user.id}`;
            saveUserData(userDataKey);
            
            console.log('✅ 로컬스토리지 저장 완료 (사용자별)');
            
        } else {
            // 로그인하지 않은 경우 기존 방식 유지 (항상 저장)
            if (Object.keys(appState.allData).length > 0) {
                localStorage.setItem('lifeManagerData', JSON.stringify(appState.allData));
                console.log('✅ 로컬스토리지 저장 완료 (allData):', Object.keys(appState.allData).length, '개 날짜');
            }
            if (Object.keys(appState.monthlyRoutines).length > 0) {
                localStorage.setItem('monthlyRoutines', JSON.stringify(appState.monthlyRoutines));
                console.log('✅ 로컬스토리지 저장 완료 (monthlyRoutines)');
            }
            if (Object.keys(appState.yearlyGoals).length > 0) {
                localStorage.setItem('yearlyGoals', JSON.stringify(appState.yearlyGoals));
                console.log('✅ 로컬스토리지 저장 완료 (yearlyGoals)');
            }
            if (Object.keys(appState.monthlyPlans).length > 0) {
                localStorage.setItem('monthlyPlans', JSON.stringify(appState.monthlyPlans));
                console.log('✅ 로컬스토리지 저장 완료 (monthlyPlans)');
            }
        }
    } catch (error) {
        console.error('❌ 데이터 저장 중 오류 발생:', error);
        // 저장 실패 시에도 로컬스토리지에 백업
        try {
            if (appState.user) {
                const userDataKey = `user_${appState.user.id}`;
                saveUserData(userDataKey);
                console.log('⚠️ 에러 발생했지만 로컬스토리지 백업 완료');
            } else {
                // 로그인하지 않은 경우에도 백업
                if (Object.keys(appState.allData).length > 0) {
                    localStorage.setItem('lifeManagerData', JSON.stringify(appState.allData));
                }
                console.log('⚠️ 에러 발생했지만 로컬스토리지 백업 완료 (비로그인)');
            }
        } catch (backupError) {
            console.error('❌ 백업 저장도 실패:', backupError);
        }
    }
};

const loadFromLocalStorage = () => {
    if (appState.user) {
        const userDataKey = `user_${appState.user.id}`;
        loadUserData(userDataKey);
    } else {
        // 로그인하지 않은 경우 기존 방식 유지
        const saved = localStorage.getItem('lifeManagerData');
        const savedRoutines = localStorage.getItem('monthlyRoutines');
        const savedYearlyGoals = localStorage.getItem('yearlyGoals');
        const savedMonthlyPlans = localStorage.getItem('monthlyPlans');
        
        if (saved) appState.allData = JSON.parse(saved);
        if (savedRoutines) appState.monthlyRoutines = JSON.parse(savedRoutines);
        if (savedYearlyGoals) appState.yearlyGoals = JSON.parse(savedYearlyGoals);
        if (savedMonthlyPlans) appState.monthlyPlans = JSON.parse(savedMonthlyPlans);
    }
};

// 오늘 날짜 키 가져오기 (항상 현재 날짜 기준)
const getTodayDateKey = () => formatDate(new Date());

// 데이터 업데이트 함수 (실시간 저장 보장, 완료된 할일 보호)
// 중요: 저장할 때는 항상 오늘 날짜로 저장
const updateCurrentData = async (updates) => {
    // 저장할 때는 항상 오늘 날짜 사용
    const todayKey = getTodayDateKey();
    const todayData = getDataForDate(new Date());
    
    // 기존 데이터 백업 (완료된 할일 보호)
    const existingCompletedTasks = (todayData.tasks || []).filter(t => t.completed);
    
    // 업데이트할 데이터 병합
    const mergedData = { ...todayData };
    
    // 모든 업데이트 필드 적용
    Object.keys(updates).forEach(key => {
        if (key === 'tasks' && Array.isArray(updates.tasks)) {
            // tasks 배열 업데이트 시 완료된 할일 보호
            const newTasks = updates.tasks;
            const newCompletedTasks = newTasks.filter(t => t.completed);
            const newIncompleteTasks = newTasks.filter(t => !t.completed);
            
            // 기존 완료된 할일과 새 완료된 할일 병합 (중복 제거)
            const allCompletedTasks = [...existingCompletedTasks];
            newCompletedTasks.forEach(newTask => {
                if (!allCompletedTasks.some(existing => existing.id === newTask.id)) {
                    allCompletedTasks.push(newTask);
                } else {
                    // 이미 존재하면 업데이트
                    const index = allCompletedTasks.findIndex(existing => existing.id === newTask.id);
                    allCompletedTasks[index] = newTask;
                }
            });
            
            // 미완료 할일과 완료된 할일 결합
            mergedData.tasks = [...newIncompleteTasks, ...allCompletedTasks];
            
        } else if (key === 'routines' && Array.isArray(updates.routines)) {
            // routines 배열도 직접 교체
            mergedData.routines = updates.routines;
        } else {
            // 다른 필드는 직접 병합
            mergedData[key] = updates[key];
        }
    });
    
    // appState.allData 업데이트 (항상 오늘 날짜로)
    appState.allData = {
        ...appState.allData,
        [todayKey]: mergedData
    };
    
    console.log('💾 데이터 업데이트 (오늘 날짜로 저장):', {
        저장날짜: todayKey,
        할일개수: mergedData.tasks?.length || 0,
        완료된할일: mergedData.tasks?.filter(t => t.completed).length || 0,
        미완료할일: mergedData.tasks?.filter(t => !t.completed).length || 0,
        카테고리별할일: mergedData.tasks?.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
        }, {}) || {}
    });
    
    // 실시간 저장 (await로 완료 대기)
    await saveToLocalStorage();
    
    // 저장 완료 후 렌더링
    renderCurrentTab();
};

// 탭 렌더링 함수
const renderCurrentTab = () => {
    // 타이머 탭이 더 이상 없으므로 'timer' 케이스는 'today'로 리다이렉트
    if (appState.currentTab === 'timer') {
        appState.currentTab = 'today';
    }
    
    switch (appState.currentTab) {
        case 'today':
            renderTodayTab();
            break;
        case 'weekly':
            renderWeeklyTab();
            break;
        case 'monthly':
            renderMonthlyTab();
            break;
        case 'goals':
            renderGoalsTab();
            break;
        default:
            // 기본값은 'today'
            appState.currentTab = 'today';
            renderTodayTab();
            break;
    }
};

// 타이머 탭 렌더링
const renderTimerTab = () => {
    // 오늘 날짜 키 생성
    const today = formatDate(new Date());
    const todayKey = `totalFocusedMinutes_${today}`;
    
    // 로컬스토리지에서 오늘의 총 집중 시간 로드
    const savedMinutes = localStorage.getItem(todayKey);
    if (savedMinutes) {
        appState.timerState.totalFocusedMinutes = parseInt(savedMinutes) || 0;
    } else {
        // 오늘 날짜의 데이터가 없으면 0으로 초기화
        appState.timerState.totalFocusedMinutes = 0;
    }
    
    updateTimerDisplay();
    updateTimerControls();
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// 타이머 디스플레이 업데이트
const updateTimerDisplay = () => {
    const timerTime = document.getElementById('timer-time');
    const timerStatus = document.getElementById('timer-status');
    const totalFocusedTime = document.getElementById('total-focused-time');
    
    if (!timerTime || !timerStatus) return;
    
    const { remainingSeconds, isRunning, isPaused } = appState.timerState;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    
    timerTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (isRunning) {
        timerStatus.textContent = '작업 중';
        timerStatus.className = 'timer-status running';
    } else if (isPaused) {
        timerStatus.textContent = '일시정지';
        timerStatus.className = 'timer-status paused';
    } else {
        timerStatus.textContent = remainingSeconds > 0 ? '준비' : '시간 설정 필요';
        timerStatus.className = 'timer-status ready';
    }
    
    if (totalFocusedTime) {
        totalFocusedTime.textContent = appState.timerState.totalFocusedMinutes;
    }
};

// 타이머 컨트롤 업데이트
const updateTimerControls = () => {
    const startBtn = document.getElementById('timer-start-btn');
    const pauseBtn = document.getElementById('timer-pause-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    
    if (!startBtn || !pauseBtn || !resetBtn) return;
    
    const { isRunning, isPaused, remainingSeconds } = appState.timerState;
    
    if (isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
    } else {
        startBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
    
    resetBtn.disabled = remainingSeconds === 0 && !isPaused;
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// 모바일 기기 감지 함수
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
};

// 고급 알람 소리 생성 함수 (윈도우 알람 소리 스타일)
const createAlarmSound = (audioContext, volume = 0.5, duration = 0.6) => {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    // 윈도우 알람 소리처럼 부드럽고 고급스러운 벨 소리
    // 여러 주파수를 조합하여 풍부하고 깔끔한 소리 생성
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C 메이저 코드)
    const amplitudes = [0.4, 0.5, 0.3];
    
    for (let i = 0; i < length; i++) {
        let sample = 0;
        const t = i / sampleRate;
        
        // 각 주파수 조합
        frequencies.forEach((freq, index) => {
            // 부드러운 감쇠 효과 (exponential fade out)
            const fadeOut = Math.exp(-t * 3);
            // 사인파로 깔끔한 소리
            sample += amplitudes[index] * Math.sin(2 * Math.PI * freq * t) * fadeOut;
            // 약간의 하모닉으로 더 풍부하게
            sample += amplitudes[index] * 0.15 * Math.sin(2 * Math.PI * freq * 2 * t) * fadeOut;
        });
        
        // 볼륨 조절 및 클리핑 방지
        data[i] = Math.max(-1, Math.min(1, sample * volume));
    }
    
    return buffer;
};

// 고급 알람 소리 재생 함수
const playAlarmSound = (volume, duration) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = createAlarmSound(audioContext, volume, 0.6); // 0.6초 길이의 소리
        
        // 알람 길이에 따라 반복 재생
        const playCount = Math.ceil(duration / 0.6); // 0.6초씩 반복
        
        for (let i = 0; i < playCount; i++) {
            setTimeout(() => {
                const source = audioContext.createBufferSource();
                const gainNode = audioContext.createGain();
                
                source.buffer = buffer;
                gainNode.gain.value = volume;
                
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                source.start(audioContext.currentTime);
            }, i * 600); // 0.6초마다 재생
        }
        
    } catch (error) {
        console.error('고급 알람 소리 재생 실패:', error);
        // 폴백: 기본 오디오 사용
        playFallbackAlarm(volume, duration);
    }
};

// 폴백 알람 소리 (Web Audio API가 지원되지 않을 경우)
const playFallbackAlarm = (volume, duration) => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZURAJR6Hh8sFwJgUwgM/z2Yk4CB1ou+3nn00QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBACBRdtOnrqFUUCkaf4PK+bCEGMYfR89OCMwYebsDv45lREAlHoeHywXAmBTCAz/PZiTgIHWi77eefTRAMUKfj8LZjHAY4ktfy');
    audio.volume = volume;
    audio.preload = 'auto';
    
    let playCount = 0;
    const maxPlays = Math.ceil(duration);
    
    const playAlarm = () => {
        if (playCount < maxPlays) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        playCount++;
                        if (playCount < maxPlays) {
                            setTimeout(playAlarm, 1000);
                        }
                    })
                    .catch(() => {
                        playCount++;
                        if (playCount < maxPlays) {
                            setTimeout(playAlarm, 1000);
                        }
                    });
            } else {
                playCount++;
                if (playCount < maxPlays) {
                    setTimeout(playAlarm, 1000);
                }
            }
        }
    };
    
    playAlarm();
};

// 타이머 시작
const startTimer = () => {
    const { remainingSeconds, isPaused } = appState.timerState;
    
    if (remainingSeconds === 0 && !isPaused) {
        alert('시간을 먼저 설정해주세요.');
        return;
    }
    
    // 모바일 브라우저를 위한 오디오 컨텍스트 초기화
    // 사용자 인터랙션 시점에 오디오 컨텍스트를 활성화
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // 오디오 컨텍스트를 활성화 (모바일에서 필요)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        } catch (e) {
            console.log('오디오 컨텍스트 초기화 실패:', e);
        }
    }
    
    appState.timerState.isRunning = true;
    appState.timerState.isPaused = false;
    
    if (appState.timerState.timerInterval) {
        clearInterval(appState.timerState.timerInterval);
    }
    
    appState.timerState.timerInterval = setInterval(() => {
        if (appState.timerState.remainingSeconds > 0) {
            appState.timerState.remainingSeconds--;
            updateTimerDisplay();
        } else {
            // 타이머 종료
            completeTimer();
        }
    }, 1000);
    
    updateTimerControls();
    updateTimerDisplay();
};

// 타이머 일시정지
const pauseTimer = () => {
    appState.timerState.isRunning = false;
    appState.timerState.isPaused = true;
    
    if (appState.timerState.timerInterval) {
        clearInterval(appState.timerState.timerInterval);
        appState.timerState.timerInterval = null;
    }
    
    updateTimerControls();
    updateTimerDisplay();
};

// 타이머 리셋
const resetTimer = () => {
    appState.timerState.isRunning = false;
    appState.timerState.isPaused = false;
    appState.timerState.remainingSeconds = appState.timerState.totalSeconds;
    
    if (appState.timerState.timerInterval) {
        clearInterval(appState.timerState.timerInterval);
        appState.timerState.timerInterval = null;
    }
    
    updateTimerControls();
    updateTimerDisplay();
};

// 타이머 완료
const completeTimer = () => {
    appState.timerState.isRunning = false;
    appState.timerState.isPaused = false;
    
    // 완료된 시간을 총 집중 시간에 추가
    const completedMinutes = Math.floor(appState.timerState.totalSeconds / 60);
    appState.timerState.totalFocusedMinutes += completedMinutes;
    
    // 오늘 날짜 키 생성
    const today = formatDate(new Date());
    const todayKey = `totalFocusedMinutes_${today}`;
    
    // 로컬스토리지에 오늘의 총 집중 시간 저장
    localStorage.setItem(todayKey, appState.timerState.totalFocusedMinutes.toString());
    
    if (appState.timerState.timerInterval) {
        clearInterval(appState.timerState.timerInterval);
        appState.timerState.timerInterval = null;
    }
    
    // 브라우저 알림
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('분출 타이머', {
            body: '작업 시간이 완료되었습니다! 휴식을 취하세요.',
            icon: '/favicon.ico'
        });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('분출 타이머', {
                    body: '작업 시간이 완료되었습니다! 휴식을 취하세요.',
                    icon: '/favicon.ico'
                });
            }
        });
    }
    
    // 알람 설정 로드
    const alarmVolume = parseFloat(localStorage.getItem('alarmVolume') || '50') / 100;
    const alarmDuration = parseInt(localStorage.getItem('alarmDuration') || '3');
    
    // 모바일에서는 진동도 함께 사용
    if (isMobileDevice() && 'vibrate' in navigator) {
        // 진동 패턴: 200ms 진동, 100ms 대기, 200ms 진동
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // 고급 알람 소리 재생
    playAlarmSound(alarmVolume, alarmDuration);
    
    alert(`작업 시간이 완료되었습니다!\n\n오늘 집중한 시간: ${appState.timerState.totalFocusedMinutes}분`);
    
    updateTimerControls();
    updateTimerDisplay();
};

// 시간 설정
const setTimer = (minutes) => {
    if (appState.timerState.isRunning) {
        if (!confirm('타이머가 실행 중입니다. 정말 시간을 변경하시겠습니까?')) {
            return;
        }
        pauseTimer();
    }
    
    appState.timerState.totalSeconds = minutes * 60;
    appState.timerState.remainingSeconds = minutes * 60;
    
    updateTimerDisplay();
    updateTimerControls();
};

// 오늘 탭 렌더링
const renderTodayTab = () => {
    const currentData = getCurrentData();
    const isToday = formatDate(new Date()) === getDateKey();
    const displayDate = appState.currentDate.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    // 날짜 표시
    document.getElementById('current-date').textContent = displayDate;
    const goTodayBtn = document.getElementById('go-today');
    if (isToday) {
        goTodayBtn.style.display = 'none';
    } else {
        goTodayBtn.style.display = 'block';
    }

    // 루틴 렌더링
    const completedRoutines = currentData.routines.filter(r => r.completed).length;
    document.getElementById('completed-routines').textContent = completedRoutines;
    
    const routinesList = document.getElementById('routines-list');
    routinesList.innerHTML = '';
    currentData.routines.forEach(routine => {
        const routineItem = document.createElement('div');
        routineItem.className = 'routine-item';
        routineItem.innerHTML = `
            <button class="routine-checkbox ${routine.completed ? 'checked' : 'unchecked'}" 
                    onclick="toggleRoutine(${routine.id})">
                ${routine.completed ? '✓' : ''}
            </button>
            <span class="routine-text ${routine.completed ? 'completed' : ''}">${routine.name}</span>
        `;
        routinesList.appendChild(routineItem);
    });

    // 할일 입력 필드 업데이트
    const newTaskInput = document.getElementById('new-task-input');
    newTaskInput.placeholder = `${categories[appState.selectedCategory].desc}을 입력하세요...`;
    
    // 카테고리 버튼 활성화 상태 업데이트
    updateCategoryButtons();

    // 카테고리별 할일 렌더링
    renderTasksByCategory();

    // 성찰 데이터 로드
    document.getElementById('grateful').value = currentData.reflection.grateful || '';
    document.getElementById('well-done').value = currentData.reflection.wellDone || '';
    document.getElementById('regret').value = currentData.reflection.regret || '';
    
    // 오늘 날짜일 때 어제 미완료 할일 확인
    if (isToday) {
        checkYesterdayIncompleteTasks();
    }
};

// 카테고리별 할일 렌더링
const renderTasksByCategory = () => {
    const currentData = getCurrentData();
    const container = document.getElementById('tasks-by-category');
    if (!container) return;
    
    container.innerHTML = '';

    // 디버깅: 현재 데이터 로그
    console.log('📋 할일 렌더링:', {
        전체할일개수: currentData.tasks?.length || 0,
        카테고리별할일: currentData.tasks?.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
        }, {}) || {}
    });

    Object.entries(categories).forEach(([key, cat]) => {
        const categoryTasks = (currentData.tasks || []).filter(t => t.category === key);
        if (categoryTasks.length === 0) return;

        // 할일을 완료 상태에 따라 정렬: 미완료가 위로, 완료가 아래로
        const sortedTasks = [...categoryTasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return 0;
        });

        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `
            <h3>
                <span>${cat.icon}</span> ${cat.name}
            </h3>
            <div class="task-list">
                ${sortedTasks.map(task => {
                    if (appState.editingTaskId === task.id) {
                        // 수정 모드
                        return `
                            <div class="task-item">
                                <button class="task-checkbox ${task.completed ? 'checked' : ''}" 
                                        onclick="toggleTask(${task.id})">
                                    ${task.completed ? '✓' : ''}
                                </button>
                                <input type="text" 
                                       class="task-edit-input" 
                                       id="edit-task-${task.id}"
                                       value="${escapeHtml(task.text)}"
                                       onkeydown="handleTaskEditKeydown(event, ${task.id})">
                                <button class="edit-save-btn" onclick="saveTaskEdit(${task.id})" title="저장"><i data-lucide="save"></i></button>
                                <button class="edit-cancel-btn" onclick="cancelTaskEdit()" title="취소"><i data-lucide="x"></i></button>
                            </div>
                        `;
                    } else {
                        // 일반 모드
                        return `
                            <div class="task-item">
                                <button class="task-checkbox ${task.completed ? 'checked' : ''}" 
                                        onclick="toggleTask(${task.id})">
                                    ${task.completed ? '✓' : ''}
                                </button>
                                <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</span>
                                <button class="edit-btn" onclick="startTaskEdit(${task.id})" title="수정"><i data-lucide="pencil"></i></button>
                                <button class="delete-btn" onclick="deleteTask(${task.id})" title="삭제"><i data-lucide="trash-2"></i></button>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        `;
        container.appendChild(section);
    });
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// 주간 탭 렌더링
const renderWeeklyTab = () => {
    const stats = getWeeklyStats();
    const weekDates = getWeekDates();
    const weekStart = weekDates[0].toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const weekEnd = weekDates[6].toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const insights = getAdvancedWeeklyInsights();

    // 주간 범위 표시
    document.getElementById('week-range').textContent = `${weekStart} ~ ${weekEnd}`;

    // 통계 업데이트
    document.getElementById('weekly-completion-rate').textContent = `${stats.completionRate}%`;
    document.getElementById('weekly-tasks-detail').textContent = `${stats.completedTasks}/${stats.totalTasks}개`;
    document.getElementById('weekly-routine-rate').textContent = `${stats.routineRate}%`;
    document.getElementById('weekly-routines-detail').textContent = `${stats.completedRoutinesCount}/${stats.totalRoutines}개`;
    document.getElementById('weekly-reflection-days').textContent = `${stats.reflectionDays}일`;
    document.getElementById('weekly-overall-score').textContent = Math.round((stats.completionRate + stats.routineRate + (stats.reflectionDays/7*100)) / 3);

    // 카테고리별 진행률 렌더링
    renderCategoryProgress(stats.categoryStats);

    // 일별 현황 렌더링
    renderDailyStats(stats.dailyStats);

    // 인사이트 렌더링
    renderInsights(insights);
    
    // 주간 성찰 버튼 이벤트 리스너 설정
    const generateWeeklyBtn = document.getElementById('generate-weekly-reflection-btn');
    if (generateWeeklyBtn && !generateWeeklyBtn.dataset.listenerAttached) {
        generateWeeklyBtn.onclick = async () => {
            await handleGenerateWeeklyReflection();
        };
        generateWeeklyBtn.dataset.listenerAttached = 'true';
    }
    
    // 저장된 주간 성찰이 있으면 표시
    const weekKey = `${weekDates[0].getFullYear()}-${String(weekDates[0].getMonth() + 1).padStart(2, '0')}-week-${Math.floor((weekDates[0].getDate() - 1) / 7) + 1}`;
    const savedWeeklyReflection = localStorage.getItem(`weekly_reflection_${weekKey}`);
    if (savedWeeklyReflection) {
        displayWeeklyReflection(savedWeeklyReflection);
    }
};

// 주간 통계 계산
const getWeeklyStats = () => {
    const weekDates = getWeekDates();
    let totalTasks = 0, completedTasks = 0, totalRoutines = 0;
    let completedRoutinesCount = 0, reflectionDays = 0;
    const dailyStats = [];
    const categoryStats = {
        work: { total: 0, completed: 0 },
        job: { total: 0, completed: 0 },
        routine: { total: 0, completed: 0 },
        personal: { total: 0, completed: 0 }
    };

    weekDates.forEach(date => {
        const key = formatDate(date);
        const data = appState.allData[key];
        
        if (data) {
            const dayTasks = data.tasks || [];
            const dayRoutines = data.routines || [];
            const dayReflection = data.reflection || {};
            const completed = dayTasks.filter(t => t.completed).length;
            const routinesCompleted = dayRoutines.filter(r => r.completed).length;
            
            totalTasks += dayTasks.length;
            completedTasks += completed;
            totalRoutines += dayRoutines.length;
            completedRoutinesCount += routinesCompleted;
            
            if (dayReflection.grateful || dayReflection.wellDone || dayReflection.regret) {
                reflectionDays++;
            }

            dayTasks.forEach(task => {
                if (categoryStats[task.category]) {
                    categoryStats[task.category].total++;
                    if (task.completed) categoryStats[task.category].completed++;
                }
            });

            dailyStats.push({
                date,
                tasksTotal: dayTasks.length,
                tasksCompleted: completed,
                routinesCompleted,
                hasReflection: !!(dayReflection.grateful || dayReflection.wellDone || dayReflection.regret)
            });
        } else {
            dailyStats.push({
                date,
                tasksTotal: 0,
                tasksCompleted: 0,
                routinesCompleted: 0,
                hasReflection: false
            });
        }
    });

    return {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalRoutines,
        completedRoutinesCount,
        routineRate: totalRoutines > 0 ? Math.round((completedRoutinesCount / totalRoutines) * 100) : 0,
        reflectionDays,
        dailyStats,
        categoryStats
    };
};

// 주간 날짜 계산
const getWeekDates = () => {
    const curr = new Date(appState.currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push(date);
    }
    return weekDates;
};

// 카테고리별 진행률 렌더링
const renderCategoryProgress = (categoryStats) => {
    const container = document.getElementById('category-progress');
    container.innerHTML = '';

    Object.entries(categories).forEach(([key, cat]) => {
        const catStats = categoryStats[key];
        const rate = catStats.total > 0 ? Math.round((catStats.completed / catStats.total) * 100) : 0;
        
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <div class="progress-header">
                <span class="progress-label">
                    <span class="progress-dot ${key}"></span>
                    ${cat.name}
                </span>
                <span class="progress-text">${catStats.completed}/${catStats.total} (${rate}%)</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${key}" style="width: ${rate}%"></div>
            </div>
        `;
        container.appendChild(progressItem);
    });
};

// 일별 현황 렌더링
const renderDailyStats = (dailyStats) => {
    const container = document.getElementById('daily-stats-list');
    container.innerHTML = '';

    dailyStats.forEach((day, idx) => {
        const dayName = ['월', '화', '수', '목', '금', '토', '일'][idx];
        const dateStr = day.date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
        const isCurrentDate = formatDate(day.date) === getDateKey();
        
        const dailyItem = document.createElement('div');
        dailyItem.className = `daily-item ${isCurrentDate ? 'current' : ''}`;
        dailyItem.onclick = () => {
            appState.currentDate = new Date(day.date);
            appState.currentTab = 'today';
            switchTab('today');
        };
        
        dailyItem.innerHTML = `
            <div class="daily-date">
                <p class="daily-day">${dayName}</p>
                <p class="daily-number">${dateStr}</p>
            </div>
            <div class="daily-progress">
                <span class="daily-progress-label">할일</span>
                <div class="daily-progress-bar">
                    <div class="daily-progress-fill" style="width: ${day.tasksTotal > 0 ? (day.tasksCompleted / day.tasksTotal) * 100 : 0}%"></div>
                </div>
                <span class="daily-progress-text">${day.tasksCompleted}/${day.tasksTotal}</span>
            </div>
            <div class="daily-routines">
                <span class="daily-routine-icon">${day.routinesCompleted > 0 ? '<i data-lucide="flame"></i>' : '<i data-lucide="circle"></i>'}</span>
                <span class="daily-routine-text">${day.routinesCompleted}/3</span>
            </div>
            ${day.hasReflection ? '<span class="daily-reflection" title="성찰 작성됨"><i data-lucide="pen-square"></i></span>' : ''}
        `;
        container.appendChild(dailyItem);
    });
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// 인사이트 렌더링
const renderInsights = (insights) => {
    const container = document.getElementById('insights-list');
    container.innerHTML = '';

    insights.forEach(insight => {
        const insightItem = document.createElement('div');
        insightItem.className = 'insight-item';
        insightItem.innerHTML = `
            <div class="insight-content">
                <span class="insight-icon">${insight.icon}</span>
                <div class="insight-text">
                    <h5 class="insight-title">${insight.title}</h5>
                    <p class="insight-description">${insight.content}</p>
                </div>
            </div>
        `;
        container.appendChild(insightItem);
    });
};

// 주간 데이터 수집 (제미나이 API용)
const collectWeeklyDataForReflection = () => {
    const stats = getWeeklyStats();
    const weekDates = getWeekDates();
    const dailyReflections = [];
    
    weekDates.forEach(date => {
        const key = formatDate(date);
        const data = appState.allData[key];
        if (data && data.reflection) {
            const reflection = data.reflection;
            if (reflection.grateful || reflection.wellDone || reflection.regret) {
                dailyReflections.push({
                    date: date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }),
                    grateful: reflection.grateful || '',
                    wellDone: reflection.wellDone || '',
                    regret: reflection.regret || ''
                });
            }
        }
    });
    
    return {
        weekStart: weekDates[0].toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
        weekEnd: weekDates[6].toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
        completionRate: stats.completionRate,
        routineRate: stats.routineRate,
        reflectionDays: stats.reflectionDays,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        categoryStats: stats.categoryStats,
        dailyReflections: dailyReflections
    };
};

// 월간 데이터 수집 (제미나이 API용)
const collectMonthlyDataForReflection = () => {
    const stats = getMonthlyStats();
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeklySummaries = [];
    const dailyReflections = [];
    
    // 주간별로 데이터 수집
    for (let day = 1; day <= daysInMonth; day += 7) {
        const weekStart = new Date(year, month, day);
        const weekEnd = new Date(year, month, Math.min(day + 6, daysInMonth));
        let weekTasks = 0, weekCompleted = 0, weekReflections = 0;
        
        for (let d = day; d <= Math.min(day + 6, daysInMonth); d++) {
            const date = new Date(year, month, d);
            const key = formatDate(date);
            const data = appState.allData[key];
            if (data) {
                weekTasks += (data.tasks || []).length;
                weekCompleted += (data.tasks || []).filter(t => t.completed).length;
                if (data.reflection && (data.reflection.grateful || data.reflection.wellDone || data.reflection.regret)) {
                    weekReflections++;
                    dailyReflections.push({
                        date: date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
                        grateful: data.reflection.grateful || '',
                        wellDone: data.reflection.wellDone || '',
                        regret: data.reflection.regret || ''
                    });
                }
            }
        }
        
        weeklySummaries.push({
            week: `${weekStart.getDate()}일 ~ ${weekEnd.getDate()}일`,
            tasks: weekTasks,
            completed: weekCompleted,
            completionRate: weekTasks > 0 ? Math.round((weekCompleted / weekTasks) * 100) : 0,
            reflections: weekReflections
        });
    }
    
    return {
        month: `${year}년 ${month + 1}월`,
        activeDays: stats.activeDays,
        completionRate: stats.completionRate,
        reflectionDays: stats.reflectionDays,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        weeklySummaries: weeklySummaries,
        dailyReflections: dailyReflections
    };
};

// 사용 가능한 Gemini 모델 찾기
const findAvailableGeminiModel = async () => {
    if (cachedGeminiModel) return cachedGeminiModel;
    
    try {
        // 모델 리스트 API로 사용 가능한 모델 확인
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const listResponse = await fetch(listUrl);
        
        if (listResponse.ok) {
            const listData = await listResponse.json();
            const availableModels = listData.models?.filter(m => 
                m.supportedGenerationMethods?.includes('generateContent')
            ) || [];
            
            if (availableModels.length > 0) {
                // 우선순위: gemini-1.5-pro > gemini-1.5-flash > gemini-pro > 기타
                const priority = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
                let selectedModel = null;
                
                for (const priorityName of priority) {
                    selectedModel = availableModels.find(m => m.name.includes(priorityName));
                    if (selectedModel) break;
                }
                
                if (!selectedModel) {
                    selectedModel = availableModels[0];
                }
                
                // 모델명에서 실제 모델명 추출 (예: "models/gemini-1.5-pro" -> "gemini-1.5-pro")
                const modelName = selectedModel.name.split('/').pop();
                cachedGeminiModel = modelName;
                console.log(`✅ 사용 가능한 모델 발견: ${modelName}`);
                return modelName;
            }
        }
    } catch (e) {
        console.warn('모델 리스트 API 호출 실패:', e);
    }
    
    // 모델 리스트 API가 실패하면 기본 모델 시도
    const defaultModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
    for (const model of defaultModels) {
        try {
            const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const testResponse = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'test' }] }]
                })
            });
            
            if (testResponse.ok) {
                cachedGeminiModel = model;
                console.log(`✅ 사용 가능한 모델 발견: ${model}`);
                return model;
            }
        } catch (e) {
            continue;
        }
    }
    
    throw new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다.');
};

// 제미나이 API 호출 함수
const callGeminiAPI = async (prompt) => {
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        throw new Error('제미나이 API 키가 설정되지 않았습니다. Google AI Studio에서 API 키를 발급받아 설정하세요.');
    }
    
    try {
        // 사용 가능한 모델 찾기
        const model = await findAvailableGeminiModel();
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,  // 성찰 내용이 길 수 있으므로 토큰 수 증가
                    topP: 0.95,
                    topK: 40
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 호출 실패: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        // 응답 구조 확인 및 파싱
        if (!data.candidates || data.candidates.length === 0) {
            console.error('API 응답:', data);
            throw new Error('API 응답에 candidates가 없습니다.');
        }
        
        const candidate = data.candidates[0];
        
        // finishReason 확인
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('응답이 완전히 생성되지 않았습니다. finishReason:', candidate.finishReason);
        }
        
        // 텍스트 추출
        let output = '';
        if (candidate.content && candidate.content.parts) {
            // 모든 parts에서 텍스트 수집
            output = candidate.content.parts
                .map(part => part.text || '')
                .join('');
        }
        
        if (!output) {
            console.error('API 응답:', data);
            throw new Error('API 응답에서 텍스트를 찾을 수 없습니다.');
        }
        
        return output;
    } catch (error) {
        console.error('제미나이 API 호출 오류:', error);
        throw error;
    }
};

// 주간 성찰 생성
const generateWeeklyReflection = async () => {
    try {
        const weeklyData = collectWeeklyDataForReflection();
        
        const prompt = `당신은 전문 인생관리 코치입니다. 아래는 이번 주(${weeklyData.weekStart} ~ ${weeklyData.weekEnd}) 동안 작성된 일일 성찰 내용입니다. 이 내용들을 종합적으로 분석하여 주간 성찰을 작성해주세요.

**주간 통계:**
- 할일 완료율: ${weeklyData.completionRate}%
- 루틴 실천율: ${weeklyData.routineRate}%
- 성찰 작성일수: ${weeklyData.reflectionDays}일 / 7일
- 총 할일: ${weeklyData.totalTasks}개 (완료: ${weeklyData.completedTasks}개)

**이번 주 일일 성찰 내용:**

${weeklyData.dailyReflections.length > 0 ? weeklyData.dailyReflections.map(r => `
**${r.date}**
- 감사한 일: ${r.grateful || '없음'}
- 잘한 일: ${r.wellDone || '없음'}
- 아쉬운 일: ${r.regret || '없음'}
`).join('\n') : '이번 주에는 일일 성찰이 작성되지 않았습니다.'}

**작성 요청사항:**

위 일일 성찰 내용들을 종합적으로 분석하여 다음 형식으로 주간 성찰을 작성해주세요. 각 섹션 사이에는 명확한 구분선(---)을 넣어주세요:

---

## 1. 감사한 점
이번 주 동안 일일 성찰에서 언급된 감사한 일들을 종합하여 정리해주세요. 패턴이나 주제가 있다면 그것도 함께 언급해주세요.

---

## 2. 잘한 점
이번 주 동안 잘한 일들과 성장한 부분을 구체적으로 정리해주세요. 일일 성찰의 "잘한 일" 내용을 바탕으로 종합적으로 분석해주세요.

---

## 3. 아쉬운 점
이번 주 동안 아쉬웠던 점들을 솔직하게 정리해주세요. 일일 성찰의 "아쉬운 일" 내용을 바탕으로 개선이 필요한 부분을 명확하게 지적해주세요.

---

## 4. 코칭 제안
위에서 분석한 내용을 바탕으로, 다음 주를 더 잘 살아내기 위한 구체적이고 실용적인 개선 방안을 제시해주세요. 번호가 매겨진 액션 플랜 형태로 작성해주세요.

---

**작성 톤:**
- 인생관리 코치로서 따뜻하게 응원하되, 필요시 냉정하고 명확한 피드백을 제공해주세요
- 구체적이고 실용적인 조언을 포함해주세요
- 격려와 함께 현실적인 개선 방안을 제시해주세요
- 불필요한 장식이나 과장 없이 진솔하게 작성해주세요

각 섹션은 2-3개의 구체적인 내용으로 구성하고, 코칭 제안은 3-5개의 실용적인 액션 아이템으로 작성해주세요.`;

        const reflection = await callGeminiAPI(prompt);
        return reflection;
    } catch (error) {
        console.error('주간 성찰 생성 오류:', error);
        throw error;
    }
};

// 월간 성찰 생성
const generateMonthlyReflection = async () => {
    try {
        const monthlyData = collectMonthlyDataForReflection();
        
        const prompt = `당신은 전문 인생관리 코치입니다. 아래는 이번 달(${monthlyData.month}) 동안 작성된 일일 성찰 내용입니다. 이 내용들을 종합적으로 분석하여 월간 성찰을 작성해주세요.

**월간 통계:**
- 활동일수: ${monthlyData.activeDays}일
- 할일 완료율: ${monthlyData.completionRate}%
- 성찰 작성일수: ${monthlyData.reflectionDays}일
- 총 할일: ${monthlyData.totalTasks}개 (완료: ${monthlyData.completedTasks}개)

**이번 달 일일 성찰 내용:**

${monthlyData.dailyReflections.length > 0 ? monthlyData.dailyReflections.map(r => `
**${r.date}**
- 감사한 일: ${r.grateful || '없음'}
- 잘한 일: ${r.wellDone || '없음'}
- 아쉬운 일: ${r.regret || '없음'}
`).join('\n') : '이번 달에는 일일 성찰이 작성되지 않았습니다.'}

**작성 요청사항:**

위 일일 성찰 내용들을 종합적으로 분석하여 다음 형식으로 월간 성찰을 작성해주세요. 각 섹션 사이에는 명확한 구분선(---)을 넣어주세요:

---

## 1. 감사한 점
이번 달 동안 일일 성찰에서 언급된 감사한 일들을 종합하여 정리해주세요. 한 달 동안의 감사 패턴이나 주요 감사 주제를 분석해주세요.

---

## 2. 잘한 점
이번 달 동안 잘한 일들과 성장한 부분을 구체적으로 정리해주세요. 일일 성찰의 "잘한 일" 내용을 바탕으로 한 달간의 성장 과정을 분석해주세요.

---

## 3. 아쉬운 점
이번 달 동안 아쉬웠던 점들을 솔직하게 정리해주세요. 일일 성찰의 "아쉬운 일" 내용을 바탕으로 개선이 필요한 부분을 명확하게 지적해주세요.

---

## 4. 코칭 제안
위에서 분석한 내용을 바탕으로, 다음 달을 더 잘 살아내기 위한 구체적이고 실용적인 개선 방안을 제시해주세요. 번호가 매겨진 액션 플랜 형태로 작성해주세요.

---

**작성 톤:**
- 인생관리 코치로서 따뜻하게 응원하되, 필요시 냉정하고 명확한 피드백을 제공해주세요
- 구체적이고 실용적인 조언을 포함해주세요
- 격려와 함께 현실적인 개선 방안을 제시해주세요
- 불필요한 장식이나 과장 없이 진솔하게 작성해주세요

각 섹션은 3-5개의 구체적인 내용으로 구성하고, 코칭 제안은 3-5개의 실용적인 액션 아이템으로 작성해주세요.`;

        const reflection = await callGeminiAPI(prompt);
        return reflection;
    } catch (error) {
        console.error('월간 성찰 생성 오류:', error);
        throw error;
    }
};

// 고급 주간 인사이트 생성
const getAdvancedWeeklyInsights = () => {
    const stats = getWeeklyStats();
    const insights = [];
    
    const dayPerformance = stats.dailyStats.map((day, idx) => ({
        day: ['월', '화', '수', '목', '금', '토', '일'][idx],
        rate: day.tasksTotal > 0 ? (day.tasksCompleted / day.tasksTotal) * 100 : 0
    }));
    const bestDay = dayPerformance.reduce((max, day) => day.rate > max.rate ? day : max, dayPerformance[0]);
    const worstDay = dayPerformance.reduce((min, day) => day.rate < min.rate && day.rate > 0 ? day : min, dayPerformance[0]);
    
    if (bestDay.rate > 0) {
        insights.push({
            icon: '<i data-lucide="trending-up"></i>',
            title: '요일별 패턴',
            content: `${bestDay.day}요일에 가장 생산적이네요 (${Math.round(bestDay.rate)}% 완료). ${worstDay.rate > 0 && worstDay.day !== bestDay.day ? `반면 ${worstDay.day}요일은 조금 힘들어하시는 것 같아요.` : ''}`,
            type: 'pattern'
        });
    }
    
    let streak = 0, maxStreak = 0;
    stats.dailyStats.forEach(day => {
        if (day.routinesCompleted >= 2) {
            streak++;
            maxStreak = Math.max(maxStreak, streak);
        } else streak = 0;
    });
    
    if (maxStreak >= 3) {
        insights.push({
            icon: '<i data-lucide="flame"></i>',
            title: '루틴 습관화',
            content: `${maxStreak}일 연속으로 루틴을 실천하셨네요! 습관이 자리잡고 있습니다.`,
            type: 'success'
        });
    } else if (stats.routineRate < 50 && stats.totalRoutines > 0) {
        insights.push({
            icon: '<i data-lucide="lightbulb"></i>',
            title: '루틴 실천 팁',
            content: `루틴 실천율이 ${stats.routineRate}%네요. 루틴을 더 쉽게 만들어보는 건 어떨까요?`,
            type: 'tip'
        });
    }
    
    if (stats.categoryStats.work.total > stats.categoryStats.personal.total * 3) {
        insights.push({
            icon: '<i data-lucide="scale"></i>',
            title: 'Work-Life Balance',
            content: `일(Work)에 많이 집중하고 계시네요. Personal 영역에도 시간을 할애해보세요.`,
            type: 'balance'
        });
    }
    
    if (stats.reflectionDays >= 5) {
        insights.push({
            icon: '<i data-lucide="sparkles"></i>',
            title: '자기 성찰',
            content: `이번 주 ${stats.reflectionDays}일 동안 성찰을 작성하셨네요! 자기 인식이 높은 분이십니다.`,
            type: 'success'
        });
    } else if (stats.reflectionDays === 0) {
        insights.push({
            icon: '<i data-lucide="pen-square"></i>',
            title: '성찰 권장',
            content: `이번 주는 성찰을 작성하지 않으셨네요. 하루 5분의 성찰이 목표 달성률을 2배 높입니다.`,
            type: 'tip'
        });
    }
    
    const overallScore = Math.round((stats.completionRate + stats.routineRate + (stats.reflectionDays/7*100)) / 3);
    if (overallScore >= 80) {
        insights.push({
            icon: '<i data-lucide="trophy"></i>',
            title: '주간 MVP',
            content: `종합 점수 ${overallScore}점! 이번 주는 정말 멋지게 보내셨습니다!`,
            type: 'success'
        });
    } else if (overallScore < 40 && stats.totalTasks > 0) {
        insights.push({
            icon: '<i data-lucide="target"></i>',
            title: '재정비 필요',
            content: `종합 점수 ${overallScore}점이네요. 괜찮아요, 목표를 조금 줄이고 작은 성공부터 쌓아가보세요.`,
            type: 'support'
        });
    }
    
    const totalIncomplete = stats.totalTasks - stats.completedTasks;
    if (totalIncomplete > 10) {
        insights.push({
            icon: '<i data-lucide="target"></i>',
            title: '목표 설정',
            content: `${totalIncomplete}개의 미완료 작업이 있습니다. 우선순위가 높은 3~5개에만 집중해보세요.`,
            type: 'tip'
        });
    }
    
    if (stats.completionRate >= 70) {
        insights.push({
            icon: '<i data-lucide="rocket"></i>',
            title: '생산성 고수',
            content: `할일 완료율 ${stats.completionRate}%! 당신의 실행력은 상위 20%에 속합니다!`,
            type: 'success'
        });
    }
    
    return insights;
};

// 월간 탭 렌더링
const renderMonthlyTab = () => {
    const stats = getMonthlyStats();
    const monthName = `${appState.currentDate.getFullYear()}년 ${appState.currentDate.getMonth() + 1}월`;
    
    document.getElementById('month-name').textContent = monthName;

    const monthlyStatsContainer = document.getElementById('monthly-stats');
    const monthlyInsightsContainer = document.getElementById('monthly-insights');

    if (stats.activeDays === 0) {
        monthlyStatsContainer.innerHTML = `
            <div class="monthly-stat-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <p style="color: #9ca3af;">이번 달 활동을 시작해보세요! 🚀</p>
            </div>
        `;
        monthlyInsightsContainer.innerHTML = '';
    } else {
        monthlyStatsContainer.innerHTML = `
            <div class="monthly-stat-card">
                <p class="monthly-stat-label">활동일수</p>
                <p class="monthly-stat-value purple">${stats.activeDays}</p>
            </div>
            <div class="monthly-stat-card">
                <p class="monthly-stat-label">완료율</p>
                <p class="monthly-stat-value cyan">${stats.completionRate}%</p>
            </div>
            <div class="monthly-stat-card">
                <p class="monthly-stat-label">성찰일수</p>
                <p class="monthly-stat-value pink">${stats.reflectionDays}</p>
            </div>
            <div class="monthly-stat-card">
                <p class="monthly-stat-label">총 작업</p>
                <p class="monthly-stat-value yellow">${stats.totalTasks}</p>
            </div>
        `;

        const insights = [];
        if (stats.completionRate >= 70) {
            insights.push({
                icon: '<i data-lucide="trophy"></i>',
                title: '월간 MVP',
                content: `완료율 ${stats.completionRate}%! 정말 대단한 한 달을 보내셨습니다!`
            });
        }
        if (stats.reflectionDays >= 20) {
            insights.push({
                icon: '<i data-lucide="sparkles"></i>',
                title: '성찰 전문가',
                content: `${stats.reflectionDays}일 성찰 작성! 자기 인식 능력이 뛰어나십니다.`
            });
        }
        if (stats.activeDays >= 25) {
            insights.push({
                icon: '<i data-lucide="calendar"></i>',
                title: '일관성의 힘',
                content: `${stats.activeDays}일 활동! 90% 이상의 일관성은 습관 형성에 결정적입니다.`
            });
        }

        monthlyInsightsContainer.innerHTML = `
            <h4><i data-lucide="brain"></i> AI 월간 인사이트</h4>
            <div class="insights-list">
                ${insights.map(insight => `
                    <div class="monthly-insight-item">
                        <div class="monthly-insight-content">
                            <span class="monthly-insight-icon">${insight.icon}</span>
                            <div class="monthly-insight-text">
                                <h5>${insight.title}</h5>
                                <p>${insight.content}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    // 월간 성찰 버튼 이벤트 리스너 설정
    const generateMonthlyBtn = document.getElementById('generate-monthly-reflection-btn');
    if (generateMonthlyBtn && !generateMonthlyBtn.dataset.listenerAttached) {
        generateMonthlyBtn.onclick = async () => {
            await handleGenerateMonthlyReflection();
        };
        generateMonthlyBtn.dataset.listenerAttached = 'true';
    }
    
    // 저장된 월간 성찰이 있으면 표시
    const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
    const savedMonthlyReflection = localStorage.getItem(`monthly_reflection_${monthKey}`);
    if (savedMonthlyReflection) {
        displayMonthlyReflection(savedMonthlyReflection);
    }
};

// 월간 통계 계산
const getMonthlyStats = () => {
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let totalTasks = 0, completedTasks = 0, reflectionDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const key = formatDate(date);
        const data = appState.allData[key];
        
        if (data) {
            const dayTasks = data.tasks || [];
            const dayReflection = data.reflection || {};
            totalTasks += dayTasks.length;
            completedTasks += dayTasks.filter(t => t.completed).length;
            if (dayReflection.grateful || dayReflection.wellDone || dayReflection.regret) {
                reflectionDays++;
            }
        }
    }
    
    return {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        reflectionDays,
        activeDays: Object.keys(appState.allData).filter(k => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length
    };
};

// 목표 탭 렌더링
const renderGoalsTab = () => {
    const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentYearGoals = appState.yearlyGoals[appState.selectedYear];
    const currentMonthPlans = appState.monthlyPlans[monthKey];
    const currentMonthRoutines = appState.monthlyRoutines[monthKey];

    // 연도 표시
    document.getElementById('selected-year').textContent = `${appState.selectedYear}년 목표`;
    document.getElementById('goals-year').textContent = appState.selectedYear;
    document.getElementById('plans-month').textContent = appState.currentDate.getMonth() + 1;
    document.getElementById('routines-month').textContent = appState.currentDate.getMonth() + 1;

    // 현재 연도 버튼 표시
    const currentYearBtn = document.getElementById('current-year-btn');
    if (appState.selectedYear !== new Date().getFullYear()) {
        currentYearBtn.style.display = 'block';
    } else {
        currentYearBtn.style.display = 'none';
    }

    // 연간 목표 렌더링
    renderYearlyGoals(currentYearGoals);

    // 월간 실천계획 렌더링
    renderMonthlyPlans(currentMonthPlans, currentYearGoals);

    // 월간 루틴 렌더링
    renderMonthlyRoutines(currentMonthRoutines);

    // 복사 다이얼로그 체크
    const currentYear = new Date().getFullYear();
    if (appState.currentTab === 'goals' && appState.selectedYear === currentYear && !currentYearGoals && appState.yearlyGoals[currentYear - 1]) {
        appState.yearToCopy = currentYear - 1;
        showCopyDialog();
    }
};

// 연간 목표 렌더링
const renderYearlyGoals = (currentYearGoals) => {
    const container = document.getElementById('yearly-goals-content');
    
    if (currentYearGoals && !appState.editingYearlyGoals.selfDev) {
        container.innerHTML = `
            <div class="space-y-4">
                ${Object.entries({
                    selfDev: { name: '자기계발', icon: '<i data-lucide="book"></i>', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' },
                    relationship: { name: '관계관리', icon: '<i data-lucide="handshake"></i>', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-800' },
                    workFinance: { name: '업무및재정관리', icon: '<i data-lucide="briefcase"></i>', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800' }
                }).map(([key, cat]) => {
                    const goalText = currentYearGoals[key];
                    if (!goalText) return '';
                    return `
                        <div class="goal-category ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}">
                            <div class="goal-category-header">
                                <span class="goal-category-icon">${cat.icon}</span>
                                <h3 class="goal-category-title">${cat.name}</h3>
                            </div>
                            <p class="goal-text">${goalText}</p>
                        </div>
                    `;
                }).join('')}
                <button onclick="startEditingYearlyGoals()" class="goal-save-btn">수정하기</button>
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        container.innerHTML = `
            <div class="space-y-4">
                ${Object.entries({
                    selfDev: { name: '자기계발', icon: '<i data-lucide="book"></i>', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' },
                    relationship: { name: '관계관리', icon: '<i data-lucide="handshake"></i>', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-800' },
                    workFinance: { name: '업무및재정관리', icon: '<i data-lucide="briefcase"></i>', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800' }
                }).map(([key, cat]) => `
                    <div class="goal-category ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}">
                        <div class="goal-category-header">
                            <span class="goal-category-icon">${cat.icon}</span>
                            <h3 class="goal-category-title">${cat.name}</h3>
                        </div>
                        <textarea class="goal-textarea" id="yearly-${key}" placeholder="${cat.name} 목표 입력...">${appState.editingYearlyGoals[key] || ''}</textarea>
                    </div>
                `).join('')}
                <button onclick="saveYearlyGoals()" class="goal-save-btn"><i data-lucide="save"></i> 저장하기</button>
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
};

// 월간 실천계획 렌더링
const renderMonthlyPlans = (currentMonthPlans, currentYearGoals) => {
    const container = document.getElementById('monthly-plans-content');
    
    if (!currentYearGoals) {
        container.innerHTML = `
            <div class="goal-category" style="text-align: center; padding: 2rem;">
                <p style="color: #6b7280;">먼저 ${appState.selectedYear}년 연간목표를 설정하세요</p>
            </div>
        `;
        return;
    }

    if (currentMonthPlans && !appState.editingMonthlyPlans.selfDev) {
        container.innerHTML = `
            <div class="space-y-4">
                ${Object.entries({
                    selfDev: { name: '자기계발', icon: '<i data-lucide="book"></i>', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' },
                    relationship: { name: '관계관리', icon: '<i data-lucide="handshake"></i>', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-800' },
                    workFinance: { name: '업무및재정관리', icon: '<i data-lucide="briefcase"></i>', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800' }
                }).map(([key, cat]) => {
                    const planText = currentMonthPlans[key];
                    if (!planText) return '';
                    return `
                        <div class="goal-category ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}">
                            <div class="goal-category-header">
                                <span class="goal-category-icon">${cat.icon}</span>
                                <h3 class="goal-category-title">${cat.name}</h3>
                            </div>
                            <p class="goal-text">${planText}</p>
                        </div>
                    `;
                }).join('')}
                <button onclick="startEditingMonthlyPlans()" class="goal-save-btn">수정하기</button>
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        container.innerHTML = `
            <div class="space-y-4">
                ${Object.entries({
                    selfDev: { name: '자기계발', icon: '<i data-lucide="book"></i>', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' },
                    relationship: { name: '관계관리', icon: '<i data-lucide="handshake"></i>', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', textColor: 'text-pink-800' },
                    workFinance: { name: '업무및재정관리', icon: '<i data-lucide="briefcase"></i>', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800' }
                }).map(([key, cat]) => `
                    <div class="goal-category ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}">
                        <div class="goal-category-header">
                            <span class="goal-category-icon">${cat.icon}</span>
                            <h3 class="goal-category-title">${cat.name}</h3>
                        </div>
                        ${currentYearGoals[key] ? `
                            <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: white; border-radius: 0.25rem; border: 1px solid #e5e7eb;">
                                <p style="font-size: 0.75rem; color: #6b7280;">연간목표</p>
                                <p style="font-size: 0.875rem;">${currentYearGoals[key]}</p>
                            </div>
                        ` : ''}
                        <textarea class="goal-textarea" id="monthly-${key}" placeholder="이번 달 실행계획...">${appState.editingMonthlyPlans[key] || ''}</textarea>
                    </div>
                `).join('')}
                <button onclick="saveMonthlyPlans()" class="goal-save-btn"><i data-lucide="save"></i> 저장하기</button>
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
};

// 월간 루틴 렌더링
const renderMonthlyRoutines = (currentMonthRoutines) => {
    const container = document.getElementById('monthly-routines-content');
    
    if (currentMonthRoutines && appState.editingRoutines[0] === '') {
        container.innerHTML = `
            <div class="space-y-3">
                <div class="routines-display">
                    ${currentMonthRoutines.map((routine, idx) => `
                        <div class="routine-display-item">
                            <span class="routine-number">${idx + 1}</span>
                            <span class="routine-name">${routine.name}</span>
                        </div>
                    `).join('')}
                </div>
                <button onclick="startEditingRoutines()" class="routine-save-btn">수정하기</button>
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        container.innerHTML = `
            <div class="space-y-3">
                <div class="routines-display">
                    ${[0, 1, 2].map(idx => `
                        <div class="routine-input-group">
                            <label class="routine-input-label">루틴 ${idx + 1}</label>
                            <input type="text" class="routine-input" id="routine-${idx}" 
                                   placeholder="예: ${['아침 명상 10분', '운동 30분', '독서 20분'][idx]}"
                                   value="${appState.editingRoutines[idx] || ''}">
                        </div>
                    `).join('')}
                </div>
                <button onclick="saveMonthlyRoutines()" class="routine-save-btn"><i data-lucide="save"></i> 저장하기</button>
            </div>
        `;
        
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
};

// 복사 다이얼로그 표시
const showCopyDialog = () => {
    const modal = document.getElementById('copy-modal');
    const text = document.getElementById('copy-modal-text');
    text.textContent = `${appState.yearToCopy}년 목표를 ${appState.selectedYear}년으로 복사하시겠습니까?`;
    modal.classList.remove('hidden');
};

// 이벤트 핸들러들
const switchTab = (tabId) => {
    // 모든 탭 버튼과 콘텐츠에서 active 클래스 제거
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭에 active 클래스 추가
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    appState.currentTab = tabId;
    renderCurrentTab();
};

const goToPreviousDay = () => {
    const newDate = new Date(appState.currentDate);
    newDate.setDate(newDate.getDate() - 1);
    appState.currentDate = newDate;
    renderCurrentTab();
};

const goToNextDay = () => {
    const newDate = new Date(appState.currentDate);
    newDate.setDate(newDate.getDate() + 1);
    appState.currentDate = newDate;
    renderCurrentTab();
};

const goToToday = () => {
    appState.currentDate = new Date();
    renderCurrentTab();
    // 오늘 날짜로 이동했을 때 어제 미완료 할일 확인
    checkYesterdayIncompleteTasks();
};

const toggleRoutine = (id) => {
    const currentData = getCurrentData();
    const updatedRoutines = currentData.routines.map(r => 
        r.id === id ? { ...r, completed: !r.completed } : r
    );
    updateCurrentData({ routines: updatedRoutines });
};

const addTask = async () => {
    const newTaskInput = document.getElementById('new-task-input');
    const taskText = newTaskInput.value.trim();
    
    if (!taskText) return;
    
    // 카테고리가 설정되지 않은 경우 기본값으로 설정
    if (!appState.selectedCategory || !categories[appState.selectedCategory]) {
        console.warn('⚠️ 선택된 카테고리가 유효하지 않습니다. 기본값(work)을 사용합니다.');
        appState.selectedCategory = 'work';
    }
    
    // 중요: 항상 오늘 날짜의 데이터를 가져와서 수정
    const todayKey = getTodayDateKey();
    const todayData = getDataForDate(new Date());
    
    const newTask = {
        id: Date.now(),
        text: taskText,
        category: appState.selectedCategory,
        completed: false
    };
    
    console.log('📝 할일 추가 (오늘 날짜로 저장):', {
        오늘날짜: todayKey,
        카테고리: appState.selectedCategory,
        할일내용: taskText,
        기존할일개수: todayData.tasks?.length || 0
    });
    
    // 기존 tasks 배열 보존 및 새 할일 추가 (완료된 할일 포함)
    const updatedTasks = [...(todayData.tasks || []), newTask];
    
    // 오늘 날짜 데이터 업데이트
    appState.allData[todayKey] = {
        ...todayData,
        tasks: updatedTasks
    };
    
    console.log('💾 오늘 날짜 데이터 업데이트 완료:', {
        날짜: todayKey,
        할일개수: updatedTasks.length
    });
    
    // 병합 후 저장 (saveTodayMerged 사용)
    if (supabase && appState.user) {
        await saveTodayMerged();
        // 로컬스토리지에도 백업
        const userDataKey = `user_${appState.user.id}`;
        saveUserData(userDataKey);
    } else {
        await saveToLocalStorage();
    }
    
    newTaskInput.value = '';
    
    // UI 업데이트
    renderCurrentTab();
};

const toggleTask = async (id) => {
    // 중요: 항상 오늘 날짜의 데이터를 가져와서 수정
    const todayKey = getTodayDateKey();
    const todayData = getDataForDate(new Date());
    const taskToToggle = todayData.tasks?.find(t => t.id === id);
    
    if (!taskToToggle) {
        console.warn('⚠️ 토글할 할일을 찾을 수 없습니다:', id);
        return;
    }
    
    const updatedTasks = todayData.tasks.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
    );
    
    console.log('🔄 할일 상태 변경 (오늘 날짜로 저장):', {
        오늘날짜: todayKey,
        ID: id,
        내용: taskToToggle.text,
        이전상태: taskToToggle.completed ? '완료' : '미완료',
        변경후: !taskToToggle.completed ? '완료' : '미완료'
    });
    
    // 오늘 날짜 데이터 업데이트
    appState.allData[todayKey] = {
        ...todayData,
        tasks: updatedTasks
    };
    
    // 병합 후 저장
    if (supabase && appState.user) {
        await saveTodayMerged();
    } else {
        await saveToLocalStorage();
    }
    
    // UI 업데이트
    renderCurrentTab();
};

const deleteTask = async (id) => {
    // 중요: 항상 오늘 날짜의 데이터를 가져와서 수정
    const todayKey = getTodayDateKey();
    const todayData = getDataForDate(new Date());
    const taskToDelete = todayData.tasks?.find(t => t.id === id);
    
    if (!taskToDelete) {
        console.warn('⚠️ 삭제할 할일을 찾을 수 없습니다:', id);
        return;
    }
    
    console.log('🗑️ 할일 삭제 (오늘 날짜로 저장):', {
        오늘날짜: todayKey,
        ID: id,
        내용: taskToDelete.text,
        완료여부: taskToDelete.completed,
        카테고리: taskToDelete.category
    });
    
    const updatedTasks = todayData.tasks.filter(t => t.id !== id);
    
    // 오늘 날짜 데이터 업데이트
    appState.allData[todayKey] = {
        ...todayData,
        tasks: updatedTasks
    };
    
    // 병합 후 저장
    if (supabase && appState.user) {
        await saveTodayMerged();
    } else {
        await saveToLocalStorage();
    }
    
    // 수정 모드였으면 취소
    if (appState.editingTaskId === id) {
        appState.editingTaskId = null;
    }
    
    // UI 업데이트
    renderCurrentTab();
};

const startTaskEdit = (id) => {
    appState.editingTaskId = id;
    renderTasksByCategory();
    // 입력 필드에 포커스
    setTimeout(() => {
        const editInput = document.getElementById(`edit-task-${id}`);
        if (editInput) {
            editInput.focus();
            editInput.select();
        }
    }, 100);
};

const saveTaskEdit = async (id) => {
    const editInput = document.getElementById(`edit-task-${id}`);
    if (!editInput) return;
    
    const newText = editInput.value.trim();
    if (newText) {
        const currentData = getCurrentData();
        const taskToEdit = currentData.tasks.find(t => t.id === id);
        
        if (!taskToEdit) {
            console.warn('⚠️ 수정할 할일을 찾을 수 없습니다:', id);
            return;
        }
        
        const updatedTasks = currentData.tasks.map(t => 
            t.id === id ? { ...t, text: newText } : t
        );
        
        console.log('✏️ 할일 수정:', {
            ID: id,
            이전내용: taskToEdit.text,
            수정내용: newText
        });
        
        // 실시간 저장 보장
        await updateCurrentData({ tasks: updatedTasks });
    }
    appState.editingTaskId = null;
    renderTasksByCategory();
};

const cancelTaskEdit = () => {
    appState.editingTaskId = null;
    renderTasksByCategory();
};

const handleTaskEditKeydown = (event, id) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveTaskEdit(id);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelTaskEdit();
    }
};

// HTML 이스케이프 함수 (이미 있을 수 있지만 확인)
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const toggleReflection = () => {
    appState.showReflection = !appState.showReflection;
    const reflectionSection = document.getElementById('reflection-section');
    const toggleBtn = document.getElementById('reflection-toggle');
    
    if (appState.showReflection) {
        reflectionSection.classList.remove('hidden');
        toggleBtn.innerHTML = '성찰 접기';
    } else {
        reflectionSection.classList.add('hidden');
        toggleBtn.innerHTML = '<i data-lucide="pen-square"></i> 하루성찰 작성하기';
    }
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

const saveReflection = async () => {
    const grateful = document.getElementById('grateful').value;
    const wellDone = document.getElementById('well-done').value;
    const regret = document.getElementById('regret').value;
    
    // 실시간 저장 보장 (updateCurrentData가 async이므로 await 사용)
    await updateCurrentData({
        reflection: { grateful, wellDone, regret }
    });
    
    alert('성찰이 저장되었습니다! 💚');
    toggleReflection();
};

// 카테고리 버튼 상태 업데이트 함수
const updateCategoryButtons = () => {
    // 모든 카테고리 버튼에서 active 클래스 제거
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택된 카테고리 버튼에 active 클래스 추가
    const selectedBtn = document.querySelector(`[data-category="${appState.selectedCategory}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
};

const changeCategory = (category) => {
    // 카테고리가 유효한지 확인
    if (!category || !categories[category]) {
        console.error('❌ 유효하지 않은 카테고리:', category);
        return;
    }
    
    appState.selectedCategory = category;
    updateCategoryButtons();
    
    console.log('🔄 카테고리 변경:', category);
    
    // 입력 필드 플레이스홀더 업데이트
    const newTaskInput = document.getElementById('new-task-input');
    if (newTaskInput && categories[category]) {
        newTaskInput.placeholder = `${categories[category].desc}을 입력하세요...`;
    }
};

const changeYear = (direction) => {
    if (direction === 'prev') {
        appState.selectedYear--;
    } else {
        appState.selectedYear++;
    }
    renderCurrentTab();
};

const goToCurrentYear = () => {
    appState.selectedYear = new Date().getFullYear();
    renderCurrentTab();
};

const startEditingYearlyGoals = () => {
    const currentYearGoals = appState.yearlyGoals[appState.selectedYear];
    appState.editingYearlyGoals = currentYearGoals ? { ...currentYearGoals } : { selfDev: '', relationship: '', workFinance: '' };
    renderCurrentTab();
};

const saveYearlyGoals = async () => {
    const selfDev = document.getElementById('yearly-selfDev').value;
    const relationship = document.getElementById('yearly-relationship').value;
    const workFinance = document.getElementById('yearly-workFinance').value;
    
    if (!selfDev && !relationship && !workFinance) {
        alert('최소 1개 이상 입력하세요!');
        return;
    }
    
    appState.yearlyGoals = {
        ...appState.yearlyGoals,
        [appState.selectedYear]: { selfDev, relationship, workFinance }
    };
    appState.editingYearlyGoals = { selfDev: '', relationship: '', workFinance: '' };
    
    // 실시간 저장 보장
    await saveToLocalStorage();
    
    alert(`✅ ${appState.selectedYear}년 목표 저장완료!`);
    renderCurrentTab();
};

const startEditingMonthlyPlans = () => {
    const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthPlans = appState.monthlyPlans[monthKey];
    appState.editingMonthlyPlans = currentMonthPlans ? { ...currentMonthPlans } : { selfDev: '', relationship: '', workFinance: '' };
    renderCurrentTab();
};

const saveMonthlyPlans = async () => {
    const selfDev = document.getElementById('monthly-selfDev').value;
    const relationship = document.getElementById('monthly-relationship').value;
    const workFinance = document.getElementById('monthly-workFinance').value;
    
    if (!selfDev && !relationship && !workFinance) {
        alert('최소 1개 이상 입력하세요!');
        return;
    }
    
    const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
    appState.monthlyPlans = {
        ...appState.monthlyPlans,
        [monthKey]: { selfDev, relationship, workFinance }
    };
    appState.editingMonthlyPlans = { selfDev: '', relationship: '', workFinance: '' };
    
    // 실시간 저장 보장
    await saveToLocalStorage();
    
    alert('✅ 월실천계획 저장완료!');
    renderCurrentTab();
};

const startEditingRoutines = () => {
    const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthRoutines = appState.monthlyRoutines[monthKey];
    appState.editingRoutines = currentMonthRoutines ? currentMonthRoutines.map(r => r.name) : ['', '', ''];
    renderCurrentTab();
};

const saveMonthlyRoutines = async () => {
    const routines = [];
    for (let i = 0; i < 3; i++) {
        const input = document.getElementById(`routine-${i}`);
        if (input && input.value.trim()) {
            routines.push(input.value.trim());
        }
    }
    
    if (routines.length === 0) {
        alert('최소 1개 이상 입력하세요!');
        return;
    }
    
    const newRoutines = routines.map((name, idx) => ({ id: idx + 1, name }));
    while (newRoutines.length < 3) {
        newRoutines.push({ id: newRoutines.length + 1, name: `루틴 ${newRoutines.length + 1}` });
    }
    
    const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
    appState.monthlyRoutines = {
        ...appState.monthlyRoutines,
        [monthKey]: newRoutines
    };
    appState.editingRoutines = ['', '', ''];
    
    // 실시간 저장 보장
    await saveToLocalStorage();
    
    alert('✅ 월간 루틴 저장완료!');
    renderCurrentTab();
};

const copyYearlyGoals = async () => {
    appState.yearlyGoals = {
        ...appState.yearlyGoals,
        [appState.selectedYear]: { ...appState.yearlyGoals[appState.yearToCopy] }
    };
    
    // 실시간 저장 보장
    await saveToLocalStorage();
    
    document.getElementById('copy-modal').classList.add('hidden');
    alert(`✅ ${appState.yearToCopy}년 목표가 복사되었습니다!`);
    renderCurrentTab();
};

const cancelCopy = () => {
    document.getElementById('copy-modal').classList.add('hidden');
};

// 어제 미완료 할일 확인 및 처리
const checkYesterdayIncompleteTasks = () => {
    // 이미 확인한 날짜인지 체크 (하루에 한 번만 표시)
    const todayKey = formatDate(new Date());
    const lastCheckedKey = localStorage.getItem('lastIncompleteCheckDate');
    
    if (lastCheckedKey === todayKey) {
        // 오늘 이미 확인했으면 다시 표시하지 않음
        console.log('ℹ️ 오늘 이미 미완료 할일을 확인했습니다.');
        return;
    }
    
    // 어제 날짜 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);
    
    console.log('🔍 어제 미완료 할일 확인:', {
        오늘날짜: todayKey,
        어제날짜: yesterdayKey,
        어제데이터존재: !!appState.allData[yesterdayKey]
    });
    
    // 어제 데이터 가져오기
    const yesterdayData = appState.allData[yesterdayKey];
    if (!yesterdayData || !yesterdayData.tasks) {
        console.log('ℹ️ 어제 데이터 또는 할일이 없습니다.');
        return;
    }
    
    console.log('📊 어제 데이터 상세:', {
        날짜: yesterdayKey,
        전체할일: yesterdayData.tasks.length,
        완료된할일: yesterdayData.tasks.filter(t => t.completed).length,
        미완료할일: yesterdayData.tasks.filter(t => !t.completed).length,
        루틴개수: yesterdayData.routines?.length || 0,
        성찰작성여부: !!(yesterdayData.reflection?.grateful || yesterdayData.reflection?.wellDone || yesterdayData.reflection?.regret)
    });
    
    // 미완료 할일 필터링
    const incompleteTasks = yesterdayData.tasks.filter(task => !task.completed);
    
    if (incompleteTasks.length === 0) {
        console.log('ℹ️ 어제 미완료 할일이 없습니다.');
        return;
    }
    
    console.log('⚠️ 어제 미완료 할일 발견:', incompleteTasks.length, '개');
    
    // 다이얼로그 표시
    showIncompleteTasksModal(incompleteTasks, yesterdayKey);
};

// 미완료 할일 모달 표시
const showIncompleteTasksModal = (incompleteTasks, yesterdayKey) => {
    const modal = document.getElementById('incomplete-tasks-modal');
    const textElement = document.getElementById('incomplete-tasks-text');
    const listElement = document.getElementById('incomplete-tasks-list');
    
    // 텍스트 설정
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    });
    
    textElement.textContent = `${yesterdayStr}에 완료하지 못한 할일 ${incompleteTasks.length}개가 있습니다. 각 할일을 개별적으로 처리하세요.`;
    
    // 할일 목록 렌더링 (각 할일마다 이어가기/삭제 버튼 추가)
    listElement.innerHTML = '';
    incompleteTasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'incomplete-task-item';
        taskItem.innerHTML = `
            <span class="incomplete-task-category">${categories[task.category].icon}</span>
            <span class="incomplete-task-text">${escapeHtml(task.text)}</span>
            <div class="incomplete-task-actions">
                <button class="task-action-btn carry-over-btn" data-task-index="${index}" title="오늘로 이어가기">이어가기</button>
                <button class="task-action-btn delete-btn" data-task-index="${index}" title="삭제">삭제</button>
            </div>
        `;
        listElement.appendChild(taskItem);
    });
    
    // 모달이 열릴 때마다 현재 할일 목록과 날짜 키 저장
    modal.dataset.incompleteTasks = JSON.stringify(incompleteTasks);
    modal.dataset.yesterdayKey = yesterdayKey;
    
    // 모달 표시
    modal.classList.remove('hidden');
    
    // 각 할일의 개별 버튼 이벤트 리스너 설정
    listElement.querySelectorAll('.carry-over-btn').forEach(btn => {
        btn.onclick = async () => {
            const taskIndex = parseInt(btn.dataset.taskIndex);
            const storedTasks = JSON.parse(modal.dataset.incompleteTasks || '[]');
            const storedYesterdayKey = modal.dataset.yesterdayKey;
            const selectedTask = storedTasks[taskIndex];
            if (selectedTask) {
                await carryOverIncompleteTasks([selectedTask], storedYesterdayKey);
            }
        };
    });
    
    listElement.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            const taskIndex = parseInt(btn.dataset.taskIndex);
            const storedTasks = JSON.parse(modal.dataset.incompleteTasks || '[]');
            const storedYesterdayKey = modal.dataset.yesterdayKey;
            const selectedTask = storedTasks[taskIndex];
            if (selectedTask) {
                deleteIncompleteTasks([selectedTask], storedYesterdayKey);
            }
        };
    });
    
    // 전체 버튼 이벤트 리스너 설정
    const carryOverBtn = document.getElementById('carry-over-all-btn');
    const deleteBtn = document.getElementById('delete-all-btn');
    const closeBtn = document.getElementById('close-incomplete-modal-btn');
    
    // 모두 다음날로 이어가기
    carryOverBtn.onclick = async () => {
        const storedTasks = JSON.parse(modal.dataset.incompleteTasks || '[]');
        const storedYesterdayKey = modal.dataset.yesterdayKey;
        await carryOverIncompleteTasks(storedTasks, storedYesterdayKey);
    };
    
    // 모두 삭제
    deleteBtn.onclick = () => {
        const storedTasks = JSON.parse(modal.dataset.incompleteTasks || '[]');
        const storedYesterdayKey = modal.dataset.yesterdayKey;
        deleteIncompleteTasks(storedTasks, storedYesterdayKey);
    };
    
    closeBtn.onclick = () => {
        closeIncompleteTasksModal(true);
    };
    
    // 모달 배경 클릭으로 닫기
    modal.onclick = (e) => {
        if (e.target.id === 'incomplete-tasks-modal') {
            closeIncompleteTasksModal(false);
        }
    };
};


// 미완료 할일을 다음날로 이어가기
const carryOverIncompleteTasks = async (incompleteTasks, yesterdayKey) => {
    // 오늘 날짜 키
    const today = new Date();
    const todayKey = formatDate(today);
    
    // 어제 데이터 백업 (안전을 위해)
    const yesterdayData = appState.allData[yesterdayKey];
    if (!yesterdayData) {
        console.warn('⚠️ 어제 데이터가 없습니다:', yesterdayKey);
        return;
    }
    
    console.log('📋 어제 데이터 백업:', {
        날짜: yesterdayKey,
        전체할일: yesterdayData.tasks?.length || 0,
        완료된할일: yesterdayData.tasks?.filter(t => t.completed).length || 0,
        미완료할일: incompleteTasks.length,
        루틴개수: yesterdayData.routines?.length || 0,
        성찰작성여부: !!(yesterdayData.reflection?.grateful || yesterdayData.reflection?.wellDone || yesterdayData.reflection?.regret)
    });
    
    // 오늘 데이터 가져오기
    const todayData = getDataForDate(today);
    const todayTasks = todayData.tasks || [];
    
    // 기존 할일 ID와 겹치지 않도록 새 ID 생성
    const maxId = todayTasks.length > 0 
        ? Math.max(...todayTasks.map(t => t.id))
        : Date.now();
    
    // 미완료 할일을 오늘 날짜로 복사 (새 ID 부여)
    const carriedOverTasks = incompleteTasks.map((task, index) => ({
        ...task,
        id: maxId + index + 1,
        completed: false // 완료 상태 초기화
    }));
    
    // 오늘 데이터 업데이트 - 직접 appState.allData에 저장
    appState.allData[todayKey] = {
        ...todayData,
        tasks: [...todayTasks, ...carriedOverTasks]
    };
    
    // 어제 데이터에서 미완료 할일만 삭제 (완료된 할일, 루틴, 성찰은 유지)
    const updatedYesterdayTasks = (yesterdayData.tasks || []).filter(task => 
        task.completed || !incompleteTasks.some(it => it.id === task.id)
    );
    
    appState.allData[yesterdayKey] = {
        ...yesterdayData, // 기존 데이터 유지 (루틴, 성찰 포함)
        tasks: updatedYesterdayTasks // 미완료 할일만 제거한 tasks 배열로 교체
    };
    
    console.log('💾 어제 데이터 업데이트 후:', {
        날짜: yesterdayKey,
        남은할일: updatedYesterdayTasks.length,
        완료된할일: updatedYesterdayTasks.filter(t => t.completed).length,
        루틴유지: !!appState.allData[yesterdayKey].routines,
        성찰유지: !!appState.allData[yesterdayKey].reflection
    });
    
    // 실시간 저장 보장
    await saveToLocalStorage();
    
    // 모달 닫기
    closeIncompleteTasksModal(false);
    
    // 오늘 날짜로 이동하여 결과 확인
    appState.currentDate = today;
    renderCurrentTab();
    
    alert(`✅ ${incompleteTasks.length}개의 할일을 오늘로 이어갔습니다!`);
    
    // 처리 후에도 미완료 할일이 남아있으면 다시 모달 표시
    setTimeout(() => {
        checkYesterdayIncompleteTasks();
    }, 500);
};

// 미완료 할일 삭제
const deleteIncompleteTasks = async (incompleteTasks, yesterdayKey) => {
    // 어제 데이터 백업 (안전을 위해)
    const yesterdayData = appState.allData[yesterdayKey];
    if (!yesterdayData) {
        console.warn('⚠️ 어제 데이터가 없습니다:', yesterdayKey);
        closeIncompleteTasksModal(false);
        return;
    }
    
    console.log('🗑️ 어제 데이터 삭제 전 백업:', {
        날짜: yesterdayKey,
        전체할일: yesterdayData.tasks?.length || 0,
        완료된할일: yesterdayData.tasks?.filter(t => t.completed).length || 0,
        삭제할할일: incompleteTasks.length,
        루틴개수: yesterdayData.routines?.length || 0,
        성찰작성여부: !!(yesterdayData.reflection?.grateful || yesterdayData.reflection?.wellDone || yesterdayData.reflection?.regret)
    });
    
    // 어제 데이터에서 미완료 할일만 삭제 (완료된 할일, 루틴, 성찰은 유지)
    const updatedYesterdayTasks = (yesterdayData.tasks || []).filter(task => 
        task.completed || !incompleteTasks.some(it => it.id === task.id)
    );
    
    appState.allData[yesterdayKey] = {
        ...yesterdayData, // 기존 데이터 유지 (루틴, 성찰 포함)
        tasks: updatedYesterdayTasks // 미완료 할일만 제거한 tasks 배열로 교체
    };
    
    console.log('💾 어제 데이터 삭제 후:', {
        날짜: yesterdayKey,
        남은할일: updatedYesterdayTasks.length,
        완료된할일: updatedYesterdayTasks.filter(t => t.completed).length,
        루틴유지: !!appState.allData[yesterdayKey].routines,
        성찰유지: !!appState.allData[yesterdayKey].reflection
    });
    
    // 실시간 저장 보장
    await saveToLocalStorage();
    
    closeIncompleteTasksModal(false);
    alert(`🗑️ ${incompleteTasks.length}개의 미완료 할일을 삭제했습니다.`);
    renderCurrentTab();
};

// 미완료 할일 모달 닫기
const closeIncompleteTasksModal = (saveCheckDate = false) => {
    const modal = document.getElementById('incomplete-tasks-modal');
    modal.classList.add('hidden');
    
    // dataset 정리
    delete modal.dataset.incompleteTasks;
    delete modal.dataset.yesterdayKey;
    
    // "나중에" 버튼을 눌렀을 때만 오늘 날짜로 확인 완료 표시
    if (saveCheckDate) {
        const todayKey = formatDate(new Date());
        localStorage.setItem('lastIncompleteCheckDate', todayKey);
    }
};

// 캘린더 관련 함수들
const showCalendar = () => {
    appState.calendarDate = new Date(appState.currentDate);
    renderCalendar();
    document.getElementById('calendar-modal').classList.remove('hidden');
};

const hideCalendar = () => {
    document.getElementById('calendar-modal').classList.add('hidden');
};

const renderCalendar = () => {
    const year = appState.calendarDate.getFullYear();
    const month = appState.calendarDate.getMonth();
    
    // 월/년도 표시
    document.getElementById('calendar-month-year').textContent = 
        `${year}년 ${month + 1}월`;
    
    // 달력 그리드 렌더링
    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';
    
    // 첫 번째 날의 요일 계산 (일요일 = 0)
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // 이전 달의 마지막 날들
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createCalendarDay(day, 'other-month', new Date(year, month - 1, day));
        calendarDays.appendChild(dayElement);
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDate(date, new Date());
        const isSelected = isSameDate(date, appState.currentDate);
        const hasData = hasDataForDate(date);
        
        let className = 'current-month';
        if (isToday) className += ' today';
        if (isSelected) className += ' selected';
        if (hasData) className += ' has-data';
        
        const dayElement = createCalendarDay(day, className, date);
        calendarDays.appendChild(dayElement);
    }
    
    // 다음 달의 첫 날들 (달력 완성)
    const remainingDays = 42 - (firstDay + daysInMonth); // 6주 * 7일 = 42
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createCalendarDay(day, 'other-month', new Date(year, month + 1, day));
        calendarDays.appendChild(dayElement);
    }
};

const createCalendarDay = (day, className, date) => {
    const dayElement = document.createElement('div');
    dayElement.className = `calendar-day ${className}`;
    dayElement.textContent = day;
    dayElement.onclick = () => selectCalendarDate(date);
    return dayElement;
};

const selectCalendarDate = (date) => {
    appState.currentDate = new Date(date);
    hideCalendar();
    renderCurrentTab();
};

const isSameDate = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

const hasDataForDate = (date) => {
    const key = formatDate(date);
    const data = appState.allData[key];
    if (!data) return false;
    
    const hasTasks = data.tasks && data.tasks.length > 0;
    const hasReflection = data.reflection && 
        (data.reflection.grateful || data.reflection.wellDone || data.reflection.regret);
    
    return hasTasks || hasReflection;
};

const navigateCalendarMonth = (direction) => {
    if (direction === 'prev') {
        appState.calendarDate.setMonth(appState.calendarDate.getMonth() - 1);
    } else {
        appState.calendarDate.setMonth(appState.calendarDate.getMonth() + 1);
    }
    renderCalendar();
};

const goToTodayInCalendar = () => {
    appState.currentDate = new Date();
    appState.calendarDate = new Date();
    hideCalendar();
    renderCurrentTab();
};

// ========== 디버깅 및 테스트 함수 (개발용) ==========

// 테스트용: 어제 날짜에 미완료 할일 생성
window.createTestIncompleteTasks = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);
    
    const testTasks = [
        { id: Date.now() + 1, text: '테스트 할일 1', category: 'work', completed: false },
        { id: Date.now() + 2, text: '테스트 할일 2', category: 'job', completed: false },
        { id: Date.now() + 3, text: '테스트 할일 3 (완료됨)', category: 'personal', completed: true }
    ];
    
    const monthlyRoutinesList = getMonthlyRoutinesForDate(yesterday);
    const defaultRoutines = monthlyRoutinesList.map(r => ({ ...r, completed: false }));
    
    appState.allData[yesterdayKey] = {
        tasks: testTasks,
        routines: defaultRoutines,
        reflection: { grateful: '', wellDone: '', regret: '' }
    };
    
    saveToLocalStorage();
    
    console.log('✅ 테스트 데이터 생성 완료:', yesterdayKey);
    console.log('생성된 데이터:', appState.allData[yesterdayKey]);
    console.log('미완료 할일 개수:', testTasks.filter(t => !t.completed).length);
};

// 테스트용: localStorage 확인 날짜 초기화
window.resetIncompleteCheckDate = () => {
    localStorage.removeItem('lastIncompleteCheckDate');
    console.log('✅ 확인 날짜 초기화 완료');
    console.log('이제 checkYesterdayIncompleteTasks()를 호출하거나 페이지를 새로고침하세요.');
};

// 테스트용: 강제로 모달 표시
window.forceShowIncompleteModal = () => {
    localStorage.removeItem('lastIncompleteCheckDate');
    checkYesterdayIncompleteTasks();
};

// 테스트용: 현재 상태 확인
window.debugIncompleteTasksStatus = () => {
    const todayKey = formatDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);
    const lastCheckedKey = localStorage.getItem('lastIncompleteCheckDate');
    
    console.log('=== 현재 상태 ===');
    console.log('오늘 날짜:', todayKey);
    console.log('어제 날짜:', yesterdayKey);
    console.log('마지막 확인 날짜:', lastCheckedKey);
    console.log('전체 데이터 키:', Object.keys(appState.allData));
    console.log('어제 데이터:', appState.allData[yesterdayKey]);
    
    if (appState.allData[yesterdayKey]) {
        const yesterdayData = appState.allData[yesterdayKey];
        const incompleteTasks = yesterdayData.tasks?.filter(t => !t.completed) || [];
        console.log('어제 전체 할일:', yesterdayData.tasks?.length || 0);
        console.log('어제 완료된 할일:', yesterdayData.tasks?.filter(t => t.completed).length || 0);
        console.log('어제 미완료 할일 개수:', incompleteTasks.length);
        console.log('어제 미완료 할일:', incompleteTasks);
        console.log('어제 루틴:', yesterdayData.routines);
        console.log('어제 성찰:', yesterdayData.reflection);
    } else {
        console.warn('⚠️ 어제 데이터가 없습니다!');
    }
};

// 데이터 복구: 로컬스토리지에서 모든 데이터 확인
window.checkAllStoredData = () => {
    const user = appState.user;
    if (user) {
        const userDataKey = `user_${user.id}`;
        const saved = localStorage.getItem(`${userDataKey}_lifeManagerData`);
        if (saved) {
            const allData = JSON.parse(saved);
            console.log('💾 저장된 모든 데이터:', Object.keys(allData));
            
            // 최근 7일 데이터 확인
            const dates = Object.keys(allData).sort().reverse().slice(0, 7);
            dates.forEach(date => {
                const data = allData[date];
                console.log(`📅 ${date}:`, {
                    할일: data.tasks?.length || 0,
                    완료할일: data.tasks?.filter(t => t.completed).length || 0,
                    루틴: data.routines?.length || 0,
                    성찰: !!(data.reflection?.grateful || data.reflection?.wellDone || data.reflection?.regret)
                });
            });
        } else {
            console.warn('⚠️ 저장된 데이터가 없습니다.');
        }
    } else {
        // 로그인하지 않은 경우
        const saved = localStorage.getItem('lifeManagerData');
        if (saved) {
            const allData = JSON.parse(saved);
            console.log('💾 저장된 모든 데이터:', Object.keys(allData));
            
            // 최근 7일 데이터 확인
            const dates = Object.keys(allData).sort().reverse().slice(0, 7);
            dates.forEach(date => {
                const data = allData[date];
                console.log(`📅 ${date}:`, {
                    할일: data.tasks?.length || 0,
                    완료할일: data.tasks?.filter(t => t.completed).length || 0,
                    루틴: data.routines?.length || 0,
                    성찰: !!(data.reflection?.grateful || data.reflection?.wellDone || data.reflection?.regret)
                });
            });
        }
    }
};

// 어제 데이터 강제 복구
window.restoreYesterdayData = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);
    
    const user = appState.user;
    let allData = {};
    
    if (user) {
        const userDataKey = `user_${user.id}`;
        const saved = localStorage.getItem(`${userDataKey}_lifeManagerData`);
        if (saved) {
            allData = JSON.parse(saved);
        }
    } else {
        const saved = localStorage.getItem('lifeManagerData');
        if (saved) {
            allData = JSON.parse(saved);
        }
    }
    
    if (allData[yesterdayKey]) {
        appState.allData[yesterdayKey] = allData[yesterdayKey];
        saveToLocalStorage();
        console.log('✅ 어제 데이터 복구 완료:', yesterdayKey);
        console.log('복구된 데이터:', allData[yesterdayKey]);
        renderCurrentTab();
        alert('✅ 어제 데이터가 복구되었습니다!');
    } else {
        console.warn('⚠️ 복구할 어제 데이터가 없습니다:', yesterdayKey);
        alert('⚠️ 복구할 어제 데이터가 없습니다.');
    }
};

// 구글 로그인 관련 함수들
// Google Sign-In 콜백 함수 구현
const handleCredentialResponseImpl = async (response) => {
    // JWT 토큰을 디코딩하여 사용자 정보 추출
    const payload = JSON.parse(decodeJwtPayload(response.credential));
    
    // Supabase 모드인 경우
    if (supabase) {
        try {
            // 1. Supabase에 사용자 등록/확인
            const { data: existingUser, error: selectError } = await supabase
                .from('users')
                .select('*')
                .eq('id', payload.sub)
                .single();
            
            let user = existingUser;
            
            // 사용자가 없으면 신규 등록
            if (!existingUser) {
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: payload.sub,
                        email: payload.email,
                        name: payload.name,
                        picture: payload.picture
                    })
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('사용자 등록 실패:', insertError);
                    alert('회원가입 중 오류가 발생했습니다.');
                    return;
                }
                
                user = newUser;
                
                // 신규 사용자 등록 시 이메일 알림 발송
                try {
                    await sendUserRegistrationEmails({
                        userName: payload.name,
                        userEmail: payload.email,
                        requestedAt: new Date().toLocaleString('ko-KR')
                    });
                    console.log('✅ 이메일 알림 발송 완료');
                } catch (emailError) {
                    console.error('⚠️ 이메일 발송 실패 (앱은 정상 작동):', emailError);
                    // 이메일 발송 실패해도 앱은 정상 작동
                }
            }
            
            // 2. 승인 여부 확인
            if (!user.is_approved) {
                alert('✋ 계정 승인 대기 중입니다.\n\n관리자가 승인하면 사용 가능합니다.\n보통 24시간 이내에 처리됩니다.\n\n문의: admin@example.com');
                logout();
                return;
            }
            
            // 3. 승인된 사용자 - 정상 로그인
            appState.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                role: user.role
            };
            
            // 4. Supabase에서 데이터 로드
            await loadUserDataFromSupabase(user.id);
            
            // 5. 실시간 동기화 시작 (중요!)
            startRealtimeSync(user.id);
            
            // 6. 오늘 날짜로 강제 설정
            appState.currentDate = new Date();
            const todayKey = formatDate(new Date());
            console.log('🔄 로그인 후 오늘 날짜로 설정:', {
                오늘날짜: todayKey,
                오늘데이터존재: !!appState.allData[todayKey],
                오늘할일개수: appState.allData[todayKey]?.tasks?.length || 0
            });
            
            updateUserInterface();
            renderCurrentTab();
            
            // 로그인 후 어제 미완료 할일 확인
            setTimeout(() => {
                checkYesterdayIncompleteTasks();
            }, 300);
            
            console.log('✅ 로그인 성공:', appState.user);
            
        } catch (error) {
            console.error('❌ 로그인 실패:', error);
            alert('로그인 중 오류가 발생했습니다.');
        }
    } else {
        // 로컬스토리지 모드 (기존 방식)
        appState.user = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };
        
        const userDataKey = `user_${appState.user.id}`;
        loadUserData(userDataKey);
        updateUserInterface();
        renderCurrentTab();
        
        // 로그인 후 어제 미완료 할일 확인
        setTimeout(() => {
            checkYesterdayIncompleteTasks();
        }, 300);
        
        console.log('로그인 성공 (로컬모드):', appState.user);
    }
};

// handleCredentialResponse는 위에서 이미 직접 구현됨

const updateUserInterface = () => {
    const userInfo = document.getElementById('user-info');
    const loginSection = document.getElementById('login-section');
    const logoutBtn = document.getElementById('logout-btn');
    const adminLinkContainer = document.getElementById('admin-link-container');
    
    if (appState.user) {
        // 로그인된 상태
        userInfo.classList.remove('hidden');
        loginSection.classList.add('hidden');
        if (logoutBtn) {
            logoutBtn.textContent = '[로그아웃]';
        }
        
        // 사용자 정보 표시
        document.getElementById('user-avatar').src = appState.user.picture;
        document.getElementById('user-name').textContent = appState.user.name;
        
        // 관리자 권한이 있는 경우에만 관리자 링크 표시
        if (adminLinkContainer) {
            if (appState.user.role === 'admin') {
                adminLinkContainer.style.display = 'flex';
            } else {
                adminLinkContainer.style.display = 'none';
            }
        }
    } else {
        // 로그아웃된 상태
        userInfo.classList.add('hidden');
        loginSection.classList.remove('hidden');
        if (logoutBtn) {
            logoutBtn.textContent = '로그아웃';
        }
        
        // 로그아웃 시 관리자 링크 숨김
        if (adminLinkContainer) {
            adminLinkContainer.style.display = 'none';
        }
    }
};

// 이메일 알림 발송 함수
const sendUserRegistrationEmails = async (userData) => {
    // EmailJS가 설정되지 않은 경우 건너뛰기
    if (!window.emailjs || EMAILJS_SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID') {
        console.warn('⚠️ EmailJS가 설정되지 않았습니다. 이메일 알림이 발송되지 않습니다.');
        return;
    }
    
    try {
        // EmailJS 초기화
        if (EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
            window.emailjs.init(EMAILJS_PUBLIC_KEY);
        }
        
        // 사용자에게 발송하는 이메일 (승인 대기 안내)
        const userEmailParams = {
            to_name: userData.userName,
            to_email: userData.userEmail,
            user_name: userData.userName,
            user_email: userData.userEmail,
            requested_at: userData.requestedAt,
            admin_email: ADMIN_EMAIL
        };
        
        await window.emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID_USER,
            userEmailParams
        );
        
        console.log('✅ 사용자 이메일 발송 완료:', userData.userEmail);
        
        // 관리자에게 발송하는 이메일 (신규 신청 알림)
        const adminEmailParams = {
            to_name: '관리자',
            to_email: ADMIN_EMAIL,
            user_name: userData.userName,
            user_email: userData.userEmail,
            requested_at: userData.requestedAt,
            admin_url: window.location.origin + '/admin.html'
        };
        
        await window.emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID_ADMIN,
            adminEmailParams
        );
        
        console.log('✅ 관리자 이메일 발송 완료:', ADMIN_EMAIL);
        
    } catch (error) {
        console.error('❌ 이메일 발송 실패:', error);
        throw error;
    }
};

// 주간 성찰 생성 핸들러
const handleGenerateWeeklyReflection = async () => {
    const btn = document.getElementById('generate-weekly-reflection-btn');
    const content = document.getElementById('weekly-reflection-content');
    
    if (!btn || !content) return;
    
    // 버튼 비활성화 및 로딩 표시
    btn.disabled = true;
    btn.textContent = '생성 중...';
    content.innerHTML = '<p class="reflection-loading">✨ AI가 주간 성찰을 생성하고 있습니다. 잠시만 기다려주세요...</p>';
    
    try {
        const reflection = await generateWeeklyReflection();
        
        // 성찰 표시
        displayWeeklyReflection(reflection);
        
        // 저장
        const weekDates = getWeekDates();
        const weekKey = `${weekDates[0].getFullYear()}-${String(weekDates[0].getMonth() + 1).padStart(2, '0')}-week-${Math.floor((weekDates[0].getDate() - 1) / 7) + 1}`;
        localStorage.setItem(`weekly_reflection_${weekKey}`, reflection);
        
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> AI 성찰 생성하기';
        alert('✅ 주간 성찰이 생성되었습니다!');
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('주간 성찰 생성 실패:', error);
        content.innerHTML = `<p class="reflection-error">❌ 성찰 생성 중 오류가 발생했습니다: ${error.message}</p>`;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> AI 성찰 생성하기';
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        alert('❌ 성찰 생성에 실패했습니다. API 키를 확인해주세요.');
    }
};

// 주간 성찰 표시
const displayWeeklyReflection = (reflection) => {
    const content = document.getElementById('weekly-reflection-content');
    if (!content) return;
    
    // 마크다운 형식을 HTML로 변환
    const html = reflection
        .replace(/## (.*)/g, '<h5>$1</h5>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    content.innerHTML = `<div class="reflection-text">${html}</div>`;
};

// 월간 성찰 생성 핸들러
const handleGenerateMonthlyReflection = async () => {
    const btn = document.getElementById('generate-monthly-reflection-btn');
    const content = document.getElementById('monthly-reflection-content');
    
    if (!btn || !content) return;
    
    // 버튼 비활성화 및 로딩 표시
    btn.disabled = true;
    btn.textContent = '생성 중...';
    content.innerHTML = '<p class="reflection-loading">✨ AI가 월간 성찰을 생성하고 있습니다. 잠시만 기다려주세요...</p>';
    
    try {
        const reflection = await generateMonthlyReflection();
        
        // 성찰 표시
        displayMonthlyReflection(reflection);
        
        // 저장
        const monthKey = `${appState.currentDate.getFullYear()}-${String(appState.currentDate.getMonth() + 1).padStart(2, '0')}`;
        localStorage.setItem(`monthly_reflection_${monthKey}`, reflection);
        
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> AI 성찰 생성하기';
        alert('✅ 월간 성찰이 생성되었습니다!');
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('월간 성찰 생성 실패:', error);
        content.innerHTML = `<p class="reflection-error">❌ 성찰 생성 중 오류가 발생했습니다: ${error.message}</p>`;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> AI 성찰 생성하기';
        // Lucide 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        alert('❌ 성찰 생성에 실패했습니다. API 키를 확인해주세요.');
    }
};

// 월간 성찰 표시
const displayMonthlyReflection = (reflection) => {
    const content = document.getElementById('monthly-reflection-content');
    if (!content) return;
    
    // 마크다운 형식을 HTML로 변환
    const html = reflection
        .replace(/## (.*)/g, '<h5>$1</h5>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    content.innerHTML = `<div class="reflection-text">${html}</div>`;
};

// 할일 병합 (ID 기준으로 중복 제거 및 병합)
function mergeTasks(remoteTasks = [], localTasks = []) {
    const map = new Map();
    
    // 원격 데이터 먼저
    for (const t of remoteTasks) {
        map.set(t.id, t);
    }
    
    // 로컬 데이터로 덮어쓰기 (로컬 우선)
    for (const t of localTasks) {
        const prev = map.get(t.id) || {};
        map.set(t.id, { ...prev, ...t });
    }
    
    return [...map.values()];
}

// 중복 함수 제거됨 - 위의 mergeDayData 사용

// 오늘 날짜 데이터 병합 후 저장 (충돌 방지)
async function saveTodayMerged() {
    if (!supabase || !appState.user) {
        console.warn('ℹ️ Supabase 또는 사용자 정보 없음');
        return;
    }
    
    const userId = appState.user.id;
    const todayKey = getTodayDateKey();
    const local = appState.allData[todayKey] || getDataForDate(new Date());
    
    console.log('🔄 저장 전 최신 데이터 확인:', {
        날짜: todayKey,
        로컬할일개수: local.tasks?.length || 0
    });
    
    // Supabase에서 최신 데이터 가져오기
    const { data: remoteRow, error: fetchError } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', userId)
        .eq('date', todayKey)
        .maybeSingle();
    
    if (fetchError) {
        console.error('❌ 최신 데이터 조회 실패:', fetchError);
    }
    
    // 병합
    const merged = mergeDayData(remoteRow?.data || {}, local);
    
    console.log('🔄 데이터 병합 완료:', {
        원격할일: remoteRow?.data?.tasks?.length || 0,
        로컬할일: local.tasks?.length || 0,
        병합후할일: merged.tasks?.length || 0
    });
    
    // 저장
    const { data: savedData, error: saveError } = await supabase
        .from('user_data')
        .upsert({
            user_id: userId,
            date: todayKey,
            data: merged,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,date'
        })
        .select();
    
    if (saveError) {
        console.error('❌ 병합 후 저장 실패:', saveError);
        throw saveError;
    }
    
    if (savedData && savedData.length > 0) {
        // 저장된 데이터로 로컬 업데이트
        appState.allData[todayKey] = savedData[0].data;
        console.log('✅ 병합 후 저장 완료:', {
            저장된할일개수: savedData[0].data?.tasks?.length || 0
        });
    }
}

const logout = () => {
    // 실시간 동기화 중지
    stopRealtimeSync();
    
    // Google 로그아웃
    google.accounts.id.disableAutoSelect();
    
    // 사용자 상태 초기화
    appState.user = null;
    appState.allData = {};
    appState.monthlyRoutines = {};
    appState.yearlyGoals = {};
    appState.monthlyPlans = {};
    
    // 로컬스토리지 초기화
    localStorage.removeItem('lifeManagerData');
    localStorage.removeItem('monthlyRoutines');
    localStorage.removeItem('yearlyGoals');
    localStorage.removeItem('monthlyPlans');
    
    // UI 업데이트
    updateUserInterface();
    renderCurrentTab();
    
    console.log('로그아웃 완료');
};

// 실시간 동기화 중지
function stopRealtimeSync() {
    if (!supabase || appState.realtimeChannels.length === 0) return;
    
    appState.realtimeChannels.forEach(ch => {
        supabase.removeChannel(ch);
    });
    appState.realtimeChannels = [];
    console.log('🔌 실시간 동기화 중지');
}

// 실시간 동기화 시작
function startRealtimeSync(userId) {
    if (!supabase || !userId) return;
    
    console.log('🔄 실시간 동기화 시작:', userId);
    
    // 기존 채널 제거
    stopRealtimeSync();
    
    // 1) 일별 데이터(user_data) 실시간 수신
    const ch1 = supabase
        .channel(`rt:user_data:${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_data',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            console.log('🔔 [user_data] 다른 세션 변경:', payload);
            const row = payload.new;
            if (row?.date && row?.data) {
                appState.allData[row.date] = row.data;
                renderCurrentTab();
                console.log(`✅ ${row.date} 데이터 실시간 업데이트`);
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ user_data 실시간 구독 완료');
            }
        });
    appState.realtimeChannels.push(ch1);
    
    // 2) 월간 루틴
    const ch2 = supabase
        .channel(`rt:monthly_routines:${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'monthly_routines',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            console.log('🔔 [monthly_routines] 다른 세션 변경:', payload);
            const row = payload.new;
            if (row?.month_key && row?.routines) {
                appState.monthlyRoutines[row.month_key] = row.routines;
                renderCurrentTab();
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ monthly_routines 실시간 구독 완료');
            }
        });
    appState.realtimeChannels.push(ch2);
    
    // 3) 연간 목표
    const ch3 = supabase
        .channel(`rt:yearly_goals:${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'yearly_goals',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            console.log('🔔 [yearly_goals] 다른 세션 변경:', payload);
            const row = payload.new;
            if (row?.year && row?.goals) {
                appState.yearlyGoals[row.year] = row.goals;
                renderCurrentTab();
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ yearly_goals 실시간 구독 완료');
            }
        });
    appState.realtimeChannels.push(ch3);
    
    // 4) 월간 계획
    const ch4 = supabase
        .channel(`rt:monthly_plans:${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'monthly_plans',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            console.log('🔔 [monthly_plans] 다른 세션 변경:', payload);
            const row = payload.new;
            if (row?.month_key && row?.plans) {
                appState.monthlyPlans[row.month_key] = row.plans;
                renderCurrentTab();
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ monthly_plans 실시간 구독 완료');
            }
        });
    appState.realtimeChannels.push(ch4);
    
    console.log('✅ 실시간 동기화 설정 완료 (4개 채널)');
}

// Supabase에서 데이터 로드 (캐시 무시)
const loadUserDataFromSupabase = async (userId) => {
    if (!supabase) return;
    
    try {
        console.log('📥 Supabase에서 데이터 로드 시작 (캐시 무시):', userId);
        
        // 일별 데이터 로드 (캐시 무시를 위해 updated_at 기준 내림차순 정렬)
        const { data: userData, error: userDataError } = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false }); // 최신 데이터 먼저
        
        if (userDataError) {
            console.error('❌ 데이터 로드 실패:', userDataError);
            throw userDataError;
        }
        
        console.log(`📥 ${userData?.length || 0}개 날짜의 데이터를 로드했습니다.`);
        
        // 데이터 복원 (기존 데이터 초기화 후 새로 로드)
        appState.allData = {};
        const todayKey = formatDate(new Date());
        
        userData?.forEach(row => {
            if (row.date && row.data) {
                appState.allData[row.date] = row.data;
                
                // 오늘 날짜 데이터 상세 로그
                if (row.date === todayKey && row.data.tasks) {
                    console.log('📥 Supabase에서 오늘 할일 로드:', {
                        날짜: row.date,
                        전체할일개수: row.data.tasks.length,
                        완료된할일: row.data.tasks.filter(t => t.completed).length,
                        미완료할일: row.data.tasks.filter(t => !t.completed).length,
                        카테고리별할일: row.data.tasks.reduce((acc, task) => {
                            acc[task.category] = (acc[task.category] || 0) + 1;
                            return acc;
                        }, {}),
                        업데이트시간: row.updated_at
                    });
                }
            }
        });
        
        // 오늘 날짜 데이터가 없으면 기본 데이터 생성
        if (!appState.allData[todayKey]) {
            console.log('ℹ️ 오늘 날짜 데이터가 없어 기본 데이터를 생성합니다.');
            const monthlyRoutinesList = getMonthlyRoutinesForDate(new Date());
            const defaultRoutines = monthlyRoutinesList.map(r => ({ ...r, completed: false }));
            appState.allData[todayKey] = {
                tasks: [],
                routines: defaultRoutines,
                reflection: { grateful: '', wellDone: '', regret: '' }
            };
        }
        
        console.log('✅ 데이터 로드 완료:', {
            전체날짜수: Object.keys(appState.allData).length,
            오늘날짜데이터존재: !!appState.allData[todayKey],
            오늘할일개수: appState.allData[todayKey]?.tasks?.length || 0
        });
        
        // 월간 루틴 로드
        const { data: routinesData, error: routinesError } = await supabase
            .from('monthly_routines')
            .select('*')
            .eq('user_id', userId);
        
        if (routinesError) throw routinesError;
        
        appState.monthlyRoutines = {};
        routinesData?.forEach(row => {
            if (row.month_key && row.routines) {
                appState.monthlyRoutines[row.month_key] = row.routines;
            }
        });
        
        // 연간 목표 로드
        const { data: goalsData, error: goalsError } = await supabase
            .from('yearly_goals')
            .select('*')
            .eq('user_id', userId);
        
        if (goalsError) throw goalsError;
        
        appState.yearlyGoals = {};
        goalsData?.forEach(row => {
            if (row.year && row.goals) {
                appState.yearlyGoals[row.year] = row.goals;
            }
        });
        
        // 월간 실천계획 로드
        const { data: plansData, error: plansError } = await supabase
            .from('monthly_plans')
            .select('*')
            .eq('user_id', userId);
        
        if (plansError) throw plansError;
        
        appState.monthlyPlans = {};
        plansData?.forEach(row => {
            if (row.month_key && row.plans) {
                appState.monthlyPlans[row.month_key] = row.plans;
            }
        });
        
        console.log('✅ Supabase에서 데이터 로드 완료:', {
            사용자: appState.user?.name || appState.user?.email,
            일별데이터: Object.keys(appState.allData).length + '개',
            월간루틴: Object.keys(appState.monthlyRoutines).length + '개',
            연간목표: Object.keys(appState.yearlyGoals).length + '개',
            월간계획: Object.keys(appState.monthlyPlans).length + '개'
        });
        
        // 로드 완료 후 오늘 날짜로 설정하고 렌더링 (중요!)
        const todayKey = formatDate(new Date());
        appState.currentDate = new Date(); // 오늘 날짜로 강제 설정
        
        console.log('🔄 로드 완료 후 오늘 날짜로 설정:', {
            설정된날짜: todayKey,
            오늘날짜데이터존재: !!appState.allData[todayKey],
            오늘할일개수: appState.allData[todayKey]?.tasks?.length || 0
        });
        
        // 즉시 렌더링
        if (typeof renderCurrentTab === 'function') {
            renderCurrentTab();
            console.log('🔄 데이터 로드 후 UI 렌더링 완료');
        }
        
    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
    }
};

const loadUserData = (userDataKey) => {
    const saved = localStorage.getItem(`${userDataKey}_lifeManagerData`);
    const savedRoutines = localStorage.getItem(`${userDataKey}_monthlyRoutines`);
    const savedYearlyGoals = localStorage.getItem(`${userDataKey}_yearlyGoals`);
    const savedMonthlyPlans = localStorage.getItem(`${userDataKey}_monthlyPlans`);
    
    if (saved) {
        appState.allData = JSON.parse(saved);
        // 로드된 데이터 확인
        const todayKey = formatDate(new Date());
        const todayData = appState.allData[todayKey];
        if (todayData && todayData.tasks) {
            console.log('📥 오늘 할일 로드:', {
                전체할일개수: todayData.tasks.length,
                카테고리별할일: todayData.tasks.reduce((acc, task) => {
                    acc[task.category] = (acc[task.category] || 0) + 1;
                    return acc;
                }, {})
            });
        }
    }
    if (savedRoutines) appState.monthlyRoutines = JSON.parse(savedRoutines);
    if (savedYearlyGoals) appState.yearlyGoals = JSON.parse(savedYearlyGoals);
    if (savedMonthlyPlans) appState.monthlyPlans = JSON.parse(savedMonthlyPlans);
};

// Supabase에 데이터 저장 (오늘 날짜만 확실하게 저장)
const saveToSupabase = async () => {
    if (!supabase || !appState.user) {
        console.log('ℹ️ Supabase 저장 건너뜀:', { hasSupabase: !!supabase, hasUser: !!appState.user });
        return;
    }
    
    try {
        const userId = appState.user.id;
        const todayKey = getTodayDateKey();
        const todayData = getDataForDate(new Date());
        
        // 오늘 날짜 데이터만 확실하게 저장
        console.log(`🔒 오늘 날짜(${todayKey}) 데이터 저장:`, {
            할일개수: todayData.tasks?.length || 0,
            루틴개수: todayData.routines?.length || 0
        });
        
        const { data: savedData, error: saveError } = await supabase
            .from('user_data')
            .upsert({
                user_id: userId,
                date: todayKey,
                data: todayData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,date'
            })
            .select();
        
        if (saveError) {
            console.error(`❌ 오늘 날짜(${todayKey}) 저장 실패:`, saveError);
            throw saveError;
        }
        
        if (savedData && savedData.length > 0) {
            const saved = savedData[0];
            console.log(`✅ 오늘 날짜(${todayKey}) 저장 완료:`, {
                저장된할일개수: saved.data?.tasks?.length || 0,
                업데이트시간: saved.updated_at
            });
            
            // 저장 후 즉시 다시 읽어서 확인
            const { data: verifyData, error: verifyError } = await supabase
                .from('user_data')
                .select('*')
                .eq('user_id', userId)
                .eq('date', todayKey)
                .single();
            
            if (!verifyError && verifyData) {
                console.log('✅ 저장 확인 완료:', {
                    Supabase할일개수: verifyData.data?.tasks?.length || 0
                });
            }
        } else {
            console.error('❌ 저장은 성공했지만 데이터가 반환되지 않음');
        }
        
        // 월간 루틴 저장
        if (Object.keys(appState.monthlyRoutines).length > 0) {
            for (const [monthKey, routines] of Object.entries(appState.monthlyRoutines)) {
                const { error: routinesError } = await supabase
                    .from('monthly_routines')
                    .upsert({
                        user_id: userId,
                        month_key: monthKey,
                        routines: routines,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,month_key'
                    });
                
                if (routinesError) throw routinesError;
            }
        }
        
        // 연간 목표 저장
        if (Object.keys(appState.yearlyGoals).length > 0) {
            for (const [year, goals] of Object.entries(appState.yearlyGoals)) {
                const { error: goalsError } = await supabase
                    .from('yearly_goals')
                    .upsert({
                        user_id: userId,
                        year: parseInt(year),
                        goals: goals,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,year'
                    });
                
                if (goalsError) throw goalsError;
            }
        }
        
        // 월간 실천계획 저장
        if (Object.keys(appState.monthlyPlans).length > 0) {
            for (const [monthKey, plans] of Object.entries(appState.monthlyPlans)) {
                const { error: plansError } = await supabase
                    .from('monthly_plans')
                    .upsert({
                        user_id: userId,
                        month_key: monthKey,
                        plans: plans,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,month_key'
                    });
                
                if (plansError) throw plansError;
            }
        }
        
        console.log('✅ Supabase에 데이터 저장 완료');
        
    } catch (error) {
        console.error('❌ 데이터 저장 실패:', error);
    }
};

const saveUserData = (userDataKey) => {
    if (Object.keys(appState.allData).length > 0) {
        localStorage.setItem(`${userDataKey}_lifeManagerData`, JSON.stringify(appState.allData));
    }
    if (Object.keys(appState.monthlyRoutines).length > 0) {
        localStorage.setItem(`${userDataKey}_monthlyRoutines`, JSON.stringify(appState.monthlyRoutines));
    }
    if (Object.keys(appState.yearlyGoals).length > 0) {
        localStorage.setItem(`${userDataKey}_yearlyGoals`, JSON.stringify(appState.yearlyGoals));
    }
    if (Object.keys(appState.monthlyPlans).length > 0) {
        localStorage.setItem(`${userDataKey}_monthlyPlans`, JSON.stringify(appState.monthlyPlans));
    }
};

// Google Sign-In 초기화 함수
const initializeGoogleSignIn = () => {
    // Google Sign-In 스크립트가 로드되었는지 확인
    if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.id) {
        console.log('✅ Google Sign-In 스크립트 로드됨');
        console.log('📍 현재 도메인:', window.location.origin);
        console.log('🔑 클라이언트 ID:', '646863604089-a5smqvgvgi5hp584dafuprjf5oa3jucf.apps.googleusercontent.com');
        
        // 콜백 함수가 제대로 등록되었는지 확인
        if (typeof window.handleCredentialResponse === 'function') {
            console.log('✅ handleCredentialResponse 함수 등록됨');
        } else {
            console.error('❌ handleCredentialResponse 함수가 등록되지 않음');
            return;
        }
        
        // Google Sign-In 초기화
        try {
            window.google.accounts.id.initialize({
                client_id: '646863604089-a5smqvgvgi5hp584dafuprjf5oa3jucf.apps.googleusercontent.com',
                callback: window.handleCredentialResponse,
                auto_select: false
            });
            
            // 로그인 버튼이 있으면 렌더링
            const signInButton = document.querySelector('.g_id_signin');
            if (signInButton) {
                window.google.accounts.id.renderButton(signInButton, {
                    type: 'standard',
                    shape: 'rectangular',
                    theme: 'outline',
                    text: 'signin_with',
                    size: 'large',
                    logo_alignment: 'left'
                });
                console.log('✅ Google Sign-In 버튼 렌더링 완료');
            }
            
            console.log('✅ Google Sign-In 초기화 완료');
        } catch (error) {
            console.error('❌ Google Sign-In 초기화 실패:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    } else {
        console.warn('⚠️ Google Sign-In 스크립트가 아직 로드되지 않음. 잠시 후 재시도...');
        // 1초 후 재시도 (최대 5번)
        if (!window.googleSignInRetryCount) {
            window.googleSignInRetryCount = 0;
        }
        if (window.googleSignInRetryCount < 5) {
            window.googleSignInRetryCount++;
            setTimeout(initializeGoogleSignIn, 1000);
        } else {
            console.error('❌ Google Sign-In 스크립트 로드 실패 (최대 재시도 횟수 초과)');
        }
    }
};

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded 이벤트 발생');
    
    // Google Sign-In 초기화 시도 (스크립트가 async defer로 로드되므로 약간의 지연 후 초기화)
    setTimeout(() => {
        initializeGoogleSignIn();
    }, 1000);
    
    // Lucide 아이콘 초기화
    const initLucideIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };
    
    // 사용자 정보 초기화 (페이지 로드 시 로그인 상태 초기화)
    appState.user = null;
    
    // UI 초기화 (로그인 버튼 표시)
    updateUserInterface();
    
    // 로컬스토리지에서 데이터 로드
    loadFromLocalStorage();
    
    // 탭 버튼 이벤트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 날짜 네비게이션 이벤트
    document.getElementById('prev-day').addEventListener('click', goToPreviousDay);
    document.getElementById('next-day').addEventListener('click', goToNextDay);
    document.getElementById('go-today').addEventListener('click', goToToday);
    
    // 할일 추가 이벤트
    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('new-task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // 카테고리 버튼 이벤트
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => changeCategory(btn.dataset.category));
    });
    
    // 성찰 이벤트
    document.getElementById('reflection-toggle').addEventListener('click', toggleReflection);
    document.getElementById('save-reflection').addEventListener('click', saveReflection);
    
    // 타이머 이벤트
    document.querySelectorAll('.timer-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'custom-time-btn') {
                const customDiv = document.getElementById('timer-custom');
                customDiv.classList.toggle('hidden');
            } else {
                const minutes = parseInt(btn.dataset.minutes);
                setTimer(minutes);
                document.getElementById('timer-custom').classList.add('hidden');
            }
        });
    });
    
    document.getElementById('set-custom-time-btn')?.addEventListener('click', () => {
        const input = document.getElementById('custom-minutes-input');
        const minutes = parseInt(input.value);
        if (minutes && minutes > 0 && minutes <= 120) {
            setTimer(minutes);
            document.getElementById('timer-custom').classList.add('hidden');
            input.value = '';
        } else {
            alert('1분에서 120분 사이의 값을 입력해주세요.');
        }
    });
    
    document.getElementById('timer-start-btn')?.addEventListener('click', startTimer);
    document.getElementById('timer-pause-btn')?.addEventListener('click', pauseTimer);
    document.getElementById('timer-reset-btn')?.addEventListener('click', resetTimer);
    
    // 커스텀 시간 입력 엔터키 지원
    document.getElementById('custom-minutes-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('set-custom-time-btn')?.click();
        }
    });
    
    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // 연도 선택 이벤트
    document.getElementById('prev-year').addEventListener('click', () => changeYear('prev'));
    document.getElementById('next-year').addEventListener('click', () => changeYear('next'));
    document.getElementById('current-year-btn').addEventListener('click', goToCurrentYear);
    
    // 복사 모달 이벤트
    document.getElementById('copy-confirm').addEventListener('click', copyYearlyGoals);
    document.getElementById('copy-cancel').addEventListener('click', cancelCopy);
    
    // 캘린더 이벤트 (날짜 정보 영역 클릭 시, '오늘로' 버튼 제외)
    document.getElementById('date-info-clickable').addEventListener('click', (e) => {
        // '오늘로' 버튼 클릭이면 캘린더를 열지 않음
        if (e.target.id === 'go-today' || e.target.closest('#go-today')) {
            return;
        }
        showCalendar();
    });
    document.getElementById('calendar-prev-month').addEventListener('click', () => navigateCalendarMonth('prev'));
    document.getElementById('calendar-next-month').addEventListener('click', () => navigateCalendarMonth('next'));
    document.getElementById('calendar-today').addEventListener('click', goToTodayInCalendar);
    document.getElementById('calendar-close').addEventListener('click', hideCalendar);
    
    // 모달 배경 클릭으로 닫기
    document.getElementById('calendar-modal').addEventListener('click', (e) => {
        if (e.target.id === 'calendar-modal') {
            hideCalendar();
        }
    });
    
    // 로그아웃 버튼 이벤트
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // 초기 UI 상태 설정
    updateUserInterface();
    
    // 초기 렌더링
    renderCurrentTab();
    
    // Lucide 아이콘 초기화
    initLucideIcons();
    
    // 페이지 로드 후 어제 미완료 할일 확인 (로그인하지 않은 경우)
    if (!appState.user) {
        setTimeout(() => {
            checkYesterdayIncompleteTasks();
            initLucideIcons();
        }, 500);
    }
    
    // 알람 설정 이벤트 리스너
    const alarmVolumeInput = document.getElementById('alarm-volume');
    const volumeDisplay = document.getElementById('volume-display');
    const alarmDurationSelect = document.getElementById('alarm-duration');
    
    // 저장된 알람 설정 로드
    const savedVolume = localStorage.getItem('alarmVolume');
    const savedDuration = localStorage.getItem('alarmDuration');
    
    if (savedVolume && alarmVolumeInput) {
        alarmVolumeInput.value = savedVolume;
        if (volumeDisplay) {
            volumeDisplay.textContent = `${savedVolume}%`;
        }
    }
    
    if (savedDuration && alarmDurationSelect) {
        alarmDurationSelect.value = savedDuration;
    }
    
    // 알람 볼륨 조절
    alarmVolumeInput?.addEventListener('input', (e) => {
        const volume = e.target.value;
        if (volumeDisplay) {
            volumeDisplay.textContent = `${volume}%`;
        }
        localStorage.setItem('alarmVolume', volume);
    });
    
    // 알람 길이 조절
    alarmDurationSelect?.addEventListener('change', (e) => {
        localStorage.setItem('alarmDuration', e.target.value);
    });
});

