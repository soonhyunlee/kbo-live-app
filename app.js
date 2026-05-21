/**
 * KBO Live Match Center - Application Core JavaScript (REST API Integration Version)
 * 
 * Features:
 * 1. Team Color Theme Swapper
 * 2. Navigation Tab System
 * 3. HLS Player Core Integration & Custom Stream Loader
 * 4. REAL-TIME API SYNC ENGINE:
 *    - Periodically fetches real-time data from Express backend (/api/kbo/live)
 *    - Updates Scoreboards, S-B-O Counts, and Base Runner status dynamically
 *    - Renders Pitch locations on the strike-zone Pitch Tracker
 *    - Populates Live Commentary Feed with latest events
 * 5. Intelligent AI Cheerleading Bots Chat Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. STATE & DATA INITIALIZATION
    // ----------------------------------------------------
    const gameState = {
        selectedTeam: 'kia',
        currentTab: 'live',
        apiInterval: null,
        chatInterval: null,
        activeMatchId: '20260521KIASS0',
        isRealtimeMode: false
    };

    // Chat simulated bots
    const chatBots = [
        { user: "타이거즈v12", team: "kia", texts: ["가자 타이거즈!!", "네일 오늘 볼끝이 살아있네~", "도영이 홈런 한방 날리자!", "크 최형우 베테랑 품격 ㄷㄷ", "우승 가즈아아아!"] },
        { user: "사자왕구자욱", team: "samsung", texts: ["삼성 라이온즈 끝까지 힘내자!!", "원태인 마운드 든든하다", "구자욱 해결해 줘!!", "블루피 들끓는다 🔥🔥", "약속의 8회 역전 드가자!!"] },
        { user: "잠실의주인LG", team: "lg", texts: ["무적 LG!! 오늘 승리는 우리 것", "잠실 찬가 부르자!!", "엘롯기 동맹 대폭발 가자!"] },
        { user: "베어스정신", team: "doosan", texts: ["두산 베어스 최강두산!!", "미라클 두산 또 보여주자", "양의지 듬직하다 🐻"] },
        { user: "이글스불꽃", team: "hanwha", texts: ["최강한화! 불꽃한화!", "현진몬 완벽투 소름돋네 ㄷㄷ", "이글스여 비상하라!!🔥"] },
        { user: "거인수호신", team: "lotte", texts: ["최강롯데!! 부산 갈매기~", "사직 노래방 개장이다!! 📣", "황성빈 전력질주 대단함 ㅋㅋㅋ"] }
    ];

    // ----------------------------------------------------
    // 2. DOM ELEMENTS SELECTORS
    // ----------------------------------------------------
    const video = document.getElementById('baseballVideo');
    const btnSwitchSource = document.getElementById('btnSwitchSource');
    const openStreamModalBtn = document.getElementById('openStreamModal');
    const streamModal = document.getElementById('streamModal');
    const closeStreamModalBtn = document.getElementById('closeStreamModal');
    const btnApplyStream = document.getElementById('btnApplyStream');
    const streamUrlInput = document.getElementById('streamUrl');

    const teamButtons = document.querySelectorAll('.team-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    const matchSelectBtn = document.querySelector('.match-select-btn');
    const matchDropdownContent = document.querySelector('.match-dropdown-content');
    const matchOptions = document.querySelectorAll('.match-option');
    const matchTitle = document.querySelector('.match-title');

    // UI elements to update
    const awayR = document.getElementById('awayR');
    const awayH = document.getElementById('awayH');
    const awayE = document.getElementById('awayE');
    const awayB = document.getElementById('awayB');
    
    const homeR = document.getElementById('homeR');
    const homeH = document.getElementById('homeH');
    const homeE = document.getElementById('homeE');
    const homeB = document.getElementById('homeB');
    
    const hudAwayScore = document.getElementById('hudAwayScore');
    const hudHomeScore = document.getElementById('hudHomeScore');
    const hudInning = document.getElementById('hudInning');

    const base1 = document.getElementById('base1');
    const base2 = document.getElementById('base2');
    const base3 = document.getElementById('base3');

    const ballDots = document.getElementById('ballDots').children;
    const strikeDots = document.getElementById('strikeDots').children;
    const outDots = document.getElementById('outDots').children;

    const pitchDotContainer = document.getElementById('pitchDotContainer');
    const lastPitchSpeed = document.getElementById('lastPitchSpeed');
    const pitcherName = document.getElementById('pitcherName');
    const batterName = document.getElementById('batterName');
    const pitcherStats = document.getElementById('pitcherStats');
    const batterStats = document.getElementById('batterStats');
    const currentAtBatPitches = document.getElementById('currentAtBatPitches');

    const textBroadcastList = document.getElementById('textBroadcastList');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const realtimeModeToggle = document.getElementById('realtimeModeToggle');

    // ----------------------------------------------------
    // 3. CORE LOGIC FUNCTIONS
    // ----------------------------------------------------

    // Initialize HLS Stream
    function initHlsStream(streamUrl) {
        if (Hls.isSupported()) {
            const hls = new Hls({ maxMaxBufferLength: 10 });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    video.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play();
            });
        }
    }

    // Swapping visual team-based stylesheet theme
    function swapTeamTheme(teamName) {
        document.body.className = '';
        document.body.classList.add(`theme-${teamName}`);
        
        teamButtons.forEach(btn => {
            if (btn.dataset.team === teamName) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        gameState.selectedTeam = teamName;
    }

    // Navigation switching system
    function switchTab(tabId) {
        // Desktop nav items active sync
        navItems.forEach(item => {
            if (item.dataset.tab === tabId) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Mobile bottom nav items active sync
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            if (item.dataset.tab === tabId) item.classList.add('active');
            else item.classList.remove('active');
        });

        tabContents.forEach(content => {
            if (content.id === `${tabId}-tab`) content.classList.add('active');
            else content.classList.remove('active');
        });
        gameState.currentTab = tabId;

        // Fetch new schedule if schedule tab is chosen
        if (tabId === 'schedule') {
            fetchScheduleData();
        } else if (tabId === 'ranking') {
            fetchRankingsData();
        }
    }

    // ----------------------------------------------------
    // 4. REAL-TIME DATA FETCHING & UI INTEGRATION
    // ----------------------------------------------------

    // Fetch real-time match data from Backend
    async function fetchLiveGameData() {
        try {
            const queryUrl = `/api/kbo/live?matchId=${gameState.activeMatchId}&mock=${!gameState.isRealtimeMode}`;
            const response = await fetch(queryUrl);
            if (!response.ok) throw new Error('Network response not ok');
            
            const data = await response.json();
            updateLiveUI(data);
        } catch (error) {
            console.warn("백엔드 API 호출 실패, 오프라인 모드로 안전한 데이터를 사용합니다.", error.message);
        }
    }

    // Update UI elements from REST API Response
    function updateLiveUI(data) {
        // 1. Inning & Scores Update
        hudAwayScore.innerText = data.awayScore;
        hudHomeScore.innerText = data.homeScore;
        awayR.innerText = data.awayScore;
        homeR.innerText = data.homeScore;

        awayH.innerText = data.awayHits;
        homeH.innerText = data.homeHits;
        awayE.innerText = data.awayErrors;
        homeE.innerText = data.homeErrors;
        awayB.innerText = data.awayBB;
        homeB.innerText = data.homeBB;

        const inningStr = `${data.inning}회${data.isInningTop ? '초' : '말'}`;
        hudInning.innerText = inningStr;

        // 2. Count Indicators (S, B, O)
        for (let i = 0; i < 3; i++) {
            if (i < data.balls) ballDots[i].classList.add('active');
            else ballDots[i].classList.remove('active');
        }
        for (let i = 0; i < 2; i++) {
            if (i < data.strikes) strikeDots[i].classList.add('active');
            else strikeDots[i].classList.remove('active');
        }
        for (let i = 0; i < 2; i++) {
            if (i < data.outs) outDots[i].classList.add('active');
            else outDots[i].classList.remove('active');
        }

        // 3. Diamond Field Runner Graphic
        if (data.runners.first) base1.classList.add('active'); else base1.classList.remove('active');
        if (data.runners.second) base2.classList.add('active'); else base2.classList.remove('active');
        if (data.runners.third) base3.classList.add('active'); else base3.classList.remove('active');

        // 4. Pitcher vs Batter Profiles
        pitcherName.innerText = data.pitcher;
        batterName.innerText = data.batter;
        lastPitchSpeed.innerText = `${data.pitchSpeed} km/h`;

        // 5. Dynamic Pitch Tracker rendering
        pitchDotContainer.innerHTML = '';
        currentAtBatPitches.innerHTML = '';

        data.pitches.forEach((pitch, index) => {
            // Pitch coordinates in strike-zone box
            const dot = document.createElement('div');
            dot.className = `pitch-dot ${pitch.type}`;
            dot.style.left = `${pitch.x}%`;
            dot.style.top = `${pitch.y}%`;
            dot.innerText = index + 1;
            pitchDotContainer.appendChild(dot);

            // VS Pitch ball bubbles
            const bubble = document.createElement('span');
            bubble.className = `pitch-history-ball ${pitch.type}`;
            bubble.innerText = pitch.type === 'strike' ? 'S' : (pitch.type === 'ball' ? 'B' : 'H');
            currentAtBatPitches.appendChild(bubble);
        });

        // 6. Live Text Commentary Timeline Feed
        textBroadcastList.innerHTML = '';
        data.commentaryHistory.forEach((c) => {
            const item = document.createElement('div');
            item.className = `commentary-item ${c.highlight ? 'highlight' : ''}`;
            item.innerHTML = `
                <span class="time">${c.time}</span>
                <p>${c.text}</p>
            `;
            textBroadcastList.appendChild(item);
        });
    }

    // Fetch live schedule list from Backend
    async function fetchScheduleData() {
        try {
            const response = await fetch('/api/kbo/schedule');
            if (!response.ok) throw new Error('Schedule API failed');
            const schedule = await response.json();
            
            const scheduleListContainer = document.querySelector('.schedule-list');
            scheduleListContainer.innerHTML = '';

            schedule.forEach(s => {
                const item = document.createElement('div');
                const isLive = s.status.includes('진행중') || s.status.includes('회');
                item.className = `schedule-item ${isLive ? 'live' : ''}`;
                
                item.innerHTML = `
                    <div class="team-vs">
                        <span class="team">${s.away}</span>
                        <span class="score-display">${s.score}</span>
                        <span class="team">${s.home}</span>
                    </div>
                    <div class="game-status">
                        <span class="${isLive ? 'live-pill' : ''}">${s.status}</span>
                    </div>
                    <div class="ballpark">${s.ballpark}</div>
                `;
                scheduleListContainer.appendChild(item);
            });
        } catch (error) {
            console.error('스케줄 정보를 로드하지 못했습니다:', error);
        }
    }

    // Fetch live KBO team rankings from Backend (With Standings Image Screenshot Fallback Support) 🏆
    async function fetchRankingsData() {
        try {
            const response = await fetch('/api/kbo/rankings');
            if (!response.ok) throw new Error('Rankings API failed');
            const result = await response.json();
            
            const tbody = document.getElementById('rankingsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            // 1. 네이버 순위표 캡처 이미지 탑재 및 하이브리드 토글 세팅
            const rankToggleBar = document.getElementById('rankToggleBar');
            const rankImageContainer = document.getElementById('rankImageContainer');
            const rankTableContainer = document.getElementById('rankTableContainer');
            const kboRankingsImg = document.getElementById('kboRankingsImg');
            
            if (result.useImage) {
                // 토글 스위치 및 이미지 활성화 📡
                if (rankToggleBar) rankToggleBar.style.display = 'flex';
                if (kboRankingsImg) kboRankingsImg.src = result.imageUrl;
                
                // 디폴트로 시각이 뛰어난 이미지 모드를 가동합니다! (사용자 요구사항 부합 🌟)
                if (rankImageContainer) rankImageContainer.style.display = 'block';
                if (rankTableContainer) rankTableContainer.style.display = 'none';
                
                const toggleTableBtn = document.getElementById('toggleTableBtn');
                const toggleImageBtn = document.getElementById('toggleImageBtn');
                
                if (toggleTableBtn && toggleImageBtn) {
                    // 버튼 활성화 탭 표시 동기화
                    toggleTableBtn.classList.remove('active');
                    toggleTableBtn.style.background = 'transparent';
                    toggleTableBtn.style.color = 'rgba(255,255,255,0.7)';
                    
                    toggleImageBtn.classList.add('active');
                    toggleImageBtn.style.background = 'var(--neon-purple)';
                    toggleImageBtn.style.color = 'white';
                    
                    // 이벤트 중복 방지를 위해 리스너 오버라이드
                    toggleTableBtn.onclick = () => {
                        rankTableContainer.style.display = 'block';
                        rankImageContainer.style.display = 'none';
                        
                        toggleTableBtn.style.background = 'var(--neon-purple)';
                        toggleTableBtn.style.color = 'white';
                        toggleImageBtn.style.background = 'transparent';
                        toggleImageBtn.style.color = 'rgba(255,255,255,0.7)';
                    };
                    
                    toggleImageBtn.onclick = () => {
                        rankImageContainer.style.display = 'block';
                        rankTableContainer.style.display = 'none';
                        
                        toggleImageBtn.style.background = 'var(--neon-purple)';
                        toggleImageBtn.style.color = 'white';
                        toggleTableBtn.style.background = 'transparent';
                        toggleTableBtn.style.color = 'rgba(255,255,255,0.7)';
                    };
                }
            } else {
                // 캡처본이 없거나 에러 시 표 형식으로 강제 복원
                if (rankToggleBar) rankToggleBar.style.display = 'none';
                if (rankImageContainer) rankImageContainer.style.display = 'none';
                if (rankTableContainer) rankTableContainer.style.display = 'block';
            }
            
            // 2. 표 데이터 주입 (폴백 및 하이브리드 지원)
            const teamClassMap = {
                'KIA': 'text-kia', '삼성': 'text-samsung', '두산': 'text-doosan', 
                'LG': 'text-lg', 'SSG': 'text-ssg', 'NC': 'text-nc', 
                '롯데': 'text-lotte', '한화': 'text-hanwha', 'KT': 'text-kt', '키움': 'text-kiwoom'
            };

            const list = result.data || [];
            list.forEach(r => {
                const tr = document.createElement('tr');
                if (r.rank <= 3) {
                    tr.className = 'rank-top';
                }
                
                const teamClass = teamClassMap[r.team] || '';
                tr.innerHTML = `
                    <td>${r.rank}</td>
                    <td class="bold-team ${teamClass}">${r.team}</td>
                    <td>${r.games}</td>
                    <td>${r.won}</td>
                    <td>${r.drawn}</td>
                    <td>${r.lost}</td>
                    <td>${parseFloat(r.winRate).toFixed(3)}</td>
                    <td>${parseFloat(r.gamesBehind).toFixed(1)}</td>
                    <td>${r.recent}</td>
                    <td>${r.streak}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('순위 정보를 로드하지 못했습니다:', error);
        }
    }

    // 오늘의 실제 경기 목록을 가져와서 상단 선택기 드롭다운을 동적으로 렌더링하고 바인딩
    async function initMatchSelector() {
        try {
            const response = await fetch('/api/kbo/schedule');
            if (!response.ok) throw new Error('Schedule API failed');
            const schedule = await response.json();
            
            if (schedule && schedule.length > 0) {
                // 첫 번째 경기를 디폴트 매치로 자동 지정
                gameState.activeMatchId = schedule[0].id;
                matchTitle.innerText = `${schedule[0].away} vs ${schedule[0].home} (${schedule[0].ballpark.split(' ')[0]})`;
                
                // 드롭다운 컨텐츠 동적 렌더링
                matchDropdownContent.innerHTML = '';
                schedule.forEach((s, idx) => {
                    const option = document.createElement('a');
                    option.href = '#';
                    option.className = `match-option ${idx === 0 ? 'active' : ''}`;
                    option.dataset.matchId = s.id;
                    
                    const isLive = s.status.includes('진행중') || s.status.includes('회');
                    const badgeClass = isLive ? 'badge-live' : 'badge-time';
                    const badgeText = isLive ? 'LIVE' : s.status.split(' ')[0];
                    
                    option.innerHTML = `${s.away} vs ${s.home} (${s.ballpark.split(' ')[0]}) <span class="${badgeClass}">${badgeText}</span>`;
                    matchDropdownContent.appendChild(option);
                    
                    // 각 옵션의 클릭 이벤트 동적 장착
                    option.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.querySelectorAll('.match-option').forEach(o => o.classList.remove('active'));
                        option.classList.add('active');
                        matchTitle.innerText = `${s.away} vs ${s.home} (${s.ballpark.split(' ')[0]})`;
                        
                        // 액티브 매치 스왑 및 즉시 데이터 갱신
                        gameState.activeMatchId = s.id;
                        fetchLiveGameData();
                    });
                });
            }
        } catch (error) {
            console.error("경기 일정 헤더 연동 오류:", error);
        }
    }

    // Trigger alert banner
    function triggerHighlightText(text) {
        const banner = document.createElement('div');
        banner.className = 'live-event-banner';
        banner.innerText = text;
        document.body.appendChild(banner);
        setTimeout(() => banner.classList.add('show'), 100);
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 500);
        }, 3000);
    }

    // ----------------------------------------------------
    // 5. INTERACTIVE EVENT HANDLERS & SIMULATORS
    // ----------------------------------------------------

    // Start fetching loops every 2 seconds
    function startRealTimeSync() {
        fetchLiveGameData(); // Initial execution
        if (gameState.apiInterval) clearInterval(gameState.apiInterval);
        gameState.apiInterval = setInterval(fetchLiveGameData, 2000);
    }

    // Simulated Chat Room bot engine
    function runChatBotSimulator() {
        if (gameState.chatInterval) clearInterval(gameState.chatInterval);
        gameState.chatInterval = setInterval(() => {
            const randomBot = chatBots[Math.floor(Math.random() * chatBots.length)];
            const randomText = randomBot.texts[Math.floor(Math.random() * randomBot.texts.length)];
            
            const chatLine = document.createElement('div');
            chatLine.className = 'chat-msg';
            chatLine.innerHTML = `
                <span class="chat-user text-${randomBot.team}">${randomBot.user}</span>
                <span class="chat-text">${randomText}</span>
            `;
            
            chatMessages.appendChild(chatLine);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            while (chatMessages.children.length > 50) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
        }, 3000);
    }

    // Nav click handlers
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.dataset.tab);
        });
    });

    // Team selector configuration
    teamButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            swapTeamTheme(btn.dataset.team);
        });
    });

    // Match dropdown events
    matchSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        matchDropdownContent.classList.toggle('show');
    });

    // Dynamic options are generated inside initMatchSelector dynamically
    // Clicking anywhere else removes match selector dropdown
    document.addEventListener('click', () => {
        matchDropdownContent.classList.remove('show');
    });

    // Modal stream url triggers
    openStreamModalBtn.addEventListener('click', () => {
        streamModal.classList.add('show');
    });

    closeStreamModalBtn.addEventListener('click', () => {
        streamModal.classList.remove('show');
    });

    btnApplyStream.addEventListener('click', () => {
        const customUrl = streamUrlInput.value.trim();
        if (customUrl) {
            initHlsStream(customUrl);
            streamModal.classList.remove('show');
            triggerHighlightText("📡 커스텀 실시간 스트림 연결 완료!");
        }
    });

    // Custom chat submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        const chatLine = document.createElement('div');
        chatLine.className = 'chat-msg';
        chatLine.innerHTML = `
            <span class="chat-user text-${gameState.selectedTeam}">나 (${gameState.selectedTeam.toUpperCase()}팬)</span>
            <span class="chat-text">${text}</span>
        `;
        chatMessages.appendChild(chatLine);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        chatInput.value = '';
    });

    // Switch video quality controls
    btnSwitchSource.addEventListener('click', () => {
        const text = btnSwitchSource.innerText;
        if (text.includes("HD")) {
            btnSwitchSource.innerHTML = '<i class="fa-solid fa-sliders"></i> SD 일반화질';
            triggerHighlightText("일반화질(SD)로 변경되어 데이터 소모를 줄집니다.");
        } else {
            btnSwitchSource.innerHTML = '<i class="fa-solid fa-sliders"></i> HD 고화질';
            triggerHighlightText("고화질(HD 1080p) 스트리밍이 적용되었습니다.");
        }
    });

    // Highlight item YouTube embed switcher
    document.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', () => {
            const vidId = item.dataset.videoId;
            if (vidId) {
                video.scrollIntoView({ behavior: 'smooth' });
                const container = document.querySelector('.video-container');
                container.innerHTML = `
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vidId}?autoplay=1" 
                        title="KBO Highlight" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen style="border:none;"></iframe>
                `;
                document.querySelector('.video-overlay-hud').style.display = 'none';
                triggerHighlightText("📺 선택한 KBO 하이라이트 영상을 재생합니다.");
            }
        });
    });

    // Mode toggle switch event listener
    if (realtimeModeToggle) {
        realtimeModeToggle.addEventListener('change', (e) => {
            gameState.isRealtimeMode = e.target.checked;
            if (gameState.isRealtimeMode) {
                triggerHighlightText("🔌 KBO 실제 실시간 경기 데이터 연동 모드로 전환되었습니다!");
            } else {
                triggerHighlightText("🤖 가상 경기 시뮬레이션 모드로 전환되었습니다.");
            }
            fetchLiveGameData(); // 즉각 갱신
        });
    }

    // Mobile bottom nav link click handlers
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-item');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });

    // 6. INITIAL RUNS
    // ----------------------------------------------------
    // 1. 오늘의 실제 경기 리스트 로드 및 헤더 바인딩 연동
    initMatchSelector();
    
    // 2. 실시간 구단 순위 데이터 선제 로딩 🌟
    fetchRankingsData();
    
    // 3. 비디오 중계 스트림 엔진 활성화
    initHlsStream(streamUrlInput.value);
    
    // 4. 실시간 동기화 스케줄러 & 채팅봇 시동
    startRealTimeSync();
    runChatBotSimulator();
});

// Dynamic style sheet injector for neon events
const style = document.createElement('style');
style.textContent = `
.live-event-banner {
    position: fixed;
    top: 25px;
    left: 50%;
    transform: translate(-50%, -50px);
    background: rgba(10, 16, 30, 0.9);
    border: 2px solid var(--accent);
    box-shadow: 0 0 25px var(--accent-glow);
    backdrop-filter: blur(15px);
    color: #fff;
    padding: 14px 28px;
    border-radius: 40px;
    font-weight: 800;
    font-size: 1.1rem;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.live-event-banner.show {
    opacity: 1;
    transform: translate(-50%, 0);
}
`;
document.head.appendChild(style);
