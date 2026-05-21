const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// ==========================================================================
// 1. KBO REAL-TIME DATA SIMULATOR (FALLBACK & ACTIVE MODE)
// ==========================================================================
// KBO 경기가 없거나 크롤링 대상 사이트 점검 시 완벽하게 구동되는 지능형 라이브 시뮬레이터 데이터
let simulatedMatchData = {
    gameStatus: 'LIVE',
    inning: 8,
    isInningTop: true,
    awayTeam: 'KIA',
    homeTeam: '삼성',
    awayScore: 4,
    homeScore: 3,
    awayHits: 7,
    homeHits: 6,
    awayErrors: 0,
    homeErrors: 1,
    awayBB: 3,
    homeBB: 4,
    balls: 1,
    strikes: 2,
    outs: 1,
    runners: { first: true, second: false, third: false },
    pitcher: '제임스 네일',
    batter: '구자욱',
    pitchSpeed: 148,
    pitches: [
        { x: 30, y: 40, type: 'strike' },
        { x: 75, y: 25, type: 'ball' },
        { x: 45, y: 55, type: 'strike' }
    ],
    lastCommentary: 'KIA 공격: 2번 타자 안치홍 우익수 앞 안타! 1루 주자 홈인성공 (1아웃)',
    commentaryHistory: [
        { time: '8회초', text: 'KIA 공격: 2번 타자 안치홍 우익수 앞 안타! 1루 주자 홈인성공 (1아웃)', highlight: true },
        { time: '8회초', text: 'KIA 공격: 1번 타자 박찬호 삼진 아웃! 원태인의 슬라이더에 헛스윙. (1아웃)', highlight: false },
        { time: '7회말', text: '삼성 공격: 9번 타자 이재현 좌익수 플라이 아웃으로 이닝 종료.', highlight: false }
    ]
};

// 백엔드에서 5초마다 시뮬레이션 데이터를 자동 업데이트하여 REST API가 살아있는 실시간 데이터처럼 작동하게 함
setInterval(() => {
    if (simulatedMatchData.gameStatus !== 'LIVE') return;
    
    const rand = Math.random();
    
    // 볼카운트 변경 시뮬레이션
    if (rand < 0.35) {
        simulatedMatchData.strikes++;
        simulatedMatchData.pitchSpeed = Math.floor(Math.random() * (155 - 135) + 135);
        simulatedMatchData.pitches.push({
            x: Math.floor(Math.random() * 50 + 25),
            y: Math.floor(Math.random() * 50 + 25),
            type: 'strike'
        });
        simulatedMatchData.lastCommentary = `제 ${simulatedMatchData.pitches.length}구 스트라이크! 타자 헛스윙합니다.`;
        
        if (simulatedMatchData.strikes >= 3) {
            simulatedMatchData.outs++;
            simulatedMatchData.strikes = 0;
            simulatedMatchData.balls = 0;
            simulatedMatchData.pitches = [];
            simulatedMatchData.lastCommentary = `${simulatedMatchData.batter} 삼진 아웃! 다음 타석으로 넘어갑니다.`;
            simulatedMatchData.commentaryHistory.unshift({
                time: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'}`,
                text: `${simulatedMatchData.isInningTop ? 'KIA' : '삼성'} 공격: ${simulatedMatchData.batter} 삼진 아웃!`,
                highlight: true
            });
            nextBatter();
        }
    } else if (rand < 0.7) {
        simulatedMatchData.balls++;
        simulatedMatchData.pitchSpeed = Math.floor(Math.random() * (155 - 135) + 135);
        simulatedMatchData.pitches.push({
            x: Math.random() < 0.5 ? Math.floor(Math.random() * 20) : Math.floor(Math.random() * 20 + 80),
            y: Math.floor(Math.random() * 80 + 10),
            type: 'ball'
        });
        simulatedMatchData.lastCommentary = `제 ${simulatedMatchData.pitches.length}구 볼! 약간 벗어났습니다.`;
        
        if (simulatedMatchData.balls >= 4) {
            simulatedMatchData.strikes = 0;
            simulatedMatchData.balls = 0;
            simulatedMatchData.pitches = [];
            simulatedMatchData.lastCommentary = `${simulatedMatchData.batter} 볼넷으로 출루합니다!`;
            simulatedMatchData.commentaryHistory.unshift({
                time: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'}`,
                text: `${simulatedMatchData.isInningTop ? 'KIA' : '삼성'} 공격: ${simulatedMatchData.batter} 볼넷 진루!`,
                highlight: true
            });
            advanceRunners(false);
            nextBatter();
        }
    } else {
        // 인플레이 타구
        simulatedMatchData.strikes = 0;
        simulatedMatchData.balls = 0;
        simulatedMatchData.pitches = [];
        
        if (Math.random() < 0.45) {
            // 안타
            const isHomeRun = Math.random() < 0.08;
            if (isHomeRun) {
                let runs = 1;
                if (simulatedMatchData.runners.first) runs++;
                if (simulatedMatchData.runners.second) runs++;
                if (simulatedMatchData.runners.third) runs++;
                
                if (simulatedMatchData.isInningTop) {
                    simulatedMatchData.awayScore += runs;
                    simulatedMatchData.awayHits++;
                } else {
                    simulatedMatchData.homeScore += runs;
                    simulatedMatchData.homeHits++;
                }
                
                simulatedMatchData.runners = { first: false, second: false, third: false };
                simulatedMatchData.lastCommentary = `💥 대형 홈런 발생!! 담장 밖으로 사라집니다! ${runs}득점 추가!`;
                simulatedMatchData.commentaryHistory.unshift({
                    time: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'}`,
                    text: `${simulatedMatchData.isInningTop ? 'KIA' : '삼성'} 공격: ${simulatedMatchData.batter} 역전 홈런 터집니다!!!`,
                    highlight: true
                });
            } else {
                if (simulatedMatchData.isInningTop) simulatedMatchData.awayHits++;
                else simulatedMatchData.homeHits++;
                
                simulatedMatchData.lastCommentary = `${simulatedMatchData.batter} 안타로 출루합니다!`;
                simulatedMatchData.commentaryHistory.unshift({
                    time: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'}`,
                    text: `${simulatedMatchData.isInningTop ? 'KIA' : '삼성'} 공격: ${simulatedMatchData.batter} 중전 안타!`,
                    highlight: true
                });
                advanceRunners(true);
            }
        } else {
            // 범타 아웃
            simulatedMatchData.outs++;
            simulatedMatchData.lastCommentary = `${simulatedMatchData.batter} 플라이 아웃으로 물러납니다.`;
            simulatedMatchData.commentaryHistory.unshift({
                time: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'}`,
                text: `${simulatedMatchData.isInningTop ? 'KIA' : '삼성'} 공격: ${simulatedMatchData.batter} 아웃.`,
                highlight: false
            });
        }
        nextBatter();
    }
    
    // 이닝 교대
    if (simulatedMatchData.outs >= 3) {
        simulatedMatchData.outs = 0;
        simulatedMatchData.balls = 0;
        simulatedMatchData.strikes = 0;
        simulatedMatchData.runners = { first: false, second: false, third: false };
        
        if (simulatedMatchData.isInningTop) {
            simulatedMatchData.isInningTop = false;
        } else {
            simulatedMatchData.isInningTop = true;
            simulatedMatchData.inning++;
            if (simulatedMatchData.inning > 9) {
                simulatedMatchData.inning = 1;
                simulatedMatchData.awayScore = 0;
                simulatedMatchData.homeScore = 0;
            }
        }
        
        simulatedMatchData.lastCommentary = `공수 교대됩니다. ${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'} 공격 시작!`;
        simulatedMatchData.commentaryHistory.unshift({
            time: `${simulatedMatchData.inning}회`,
            text: `공수 교대. 현재 스코어 ${simulatedMatchData.awayScore}:${simulatedMatchData.homeScore}`,
            highlight: true
        });
        nextBatter();
    }
    
}, 4000); // 4초마다 갱신하여 빠른 테스트 가능

function nextBatter() {
    const kiaBatters = ["김도영", "나성범", "최형우", "소크라테스", "박찬호", "김태군", "이우성"];
    const samsungBatters = ["구자욱", "박병호", "디아즈", "이재현", "김영웅", "김지찬", "이성규"];
    simulatedMatchData.batter = simulatedMatchData.isInningTop 
        ? kiaBatters[Math.floor(Math.random() * kiaBatters.length)]
        : samsungBatters[Math.floor(Math.random() * samsungBatters.length)];
    simulatedMatchData.pitcher = simulatedMatchData.isInningTop ? '원태인' : '제임스 네일';
}

function advanceRunners(isHit) {
    if (isHit) {
        if (simulatedMatchData.runners.third) {
            if (simulatedMatchData.isInningTop) simulatedMatchData.awayScore++; else simulatedMatchData.homeScore++;
            simulatedMatchData.runners.third = false;
        }
        if (simulatedMatchData.runners.second) {
            simulatedMatchData.runners.third = true;
            simulatedMatchData.runners.second = false;
        }
        if (simulatedMatchData.runners.first) {
            simulatedMatchData.runners.second = true;
        }
        simulatedMatchData.runners.first = true;
    } else {
        // 밀어내기
        if (simulatedMatchData.runners.first && simulatedMatchData.runners.second && simulatedMatchData.runners.third) {
            if (simulatedMatchData.isInningTop) simulatedMatchData.awayScore++; else simulatedMatchData.homeScore++;
        } else if (simulatedMatchData.runners.first && simulatedMatchData.runners.second) {
            simulatedMatchData.runners.third = true;
        } else if (simulatedMatchData.runners.first) {
            simulatedMatchData.runners.second = true;
        }
        simulatedMatchData.runners.first = true;
    }
}

// 한국 시간(KST) 기준으로 오늘 날짜 포맷팅 유틸리티
function getKstDate() {
    const kstOffset = 9 * 60 * 60 * 1000;
    const today = new Date(Date.now() + kstOffset);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return {
        formatted: `${yyyy}-${mm}-${dd}`, // YYYY-MM-DD
        compact: `${yyyy}${mm}${dd}`       // YYYYMMDD
    };
}

// ==========================================================================
// 2. REAL-TIME WEB SCRAPER ROUTE
// ==========================================================================
app.get('/api/kbo/live', async (req, res) => {
    const isMockMode = req.query.mock !== 'false';
    
    if (isMockMode) {
        // 기본 모드: 정교하게 돌아가는 지능형 백엔드 시뮬레이터 데이터 반환
        return res.json(simulatedMatchData);
    }
    
    // 실제 라이브 정보 크롤링 구현부 (사용자가 API mock 모드를 꺼두었을 때 동작)
    try {
        const { formatted, compact } = getKstDate();
        let matchId = req.query.matchId;
        
        // 쿼리 매개변수에 구체적인 경기 ID가 제공되지 않았을 때의 동적 폴백 지능형 설계
        if (!matchId) {
            try {
                const scheduleUrl = `https://m.sports.naver.com/api/schedule/sports/kbo?date=${formatted}`;
                const scheduleRes = await axios.get(scheduleUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
                const games = scheduleRes.data.games || [];
                if (games.length > 0) {
                    // 오늘 열리는 첫 번째 실제 경기의 진짜 ID를 디폴트로 주입! 🌟
                    matchId = games[0].gameId;
                }
            } catch (scheduleErr) {
                console.warn("디폴트 경기 ID 동적 획득 실패, 안전 폴백을 적용합니다:", scheduleErr.message);
            }
        }
        
        // 만약 오늘 경기가 없는 오프데이일 경우의 최후의 보루
        if (!matchId) {
            matchId = `${compact}KIASS0`;
        }
        
        const naverSportsUrl = `https://m.sports.naver.com/api/game/${matchId}/relay`; 
        
        const response = await axios.get(naverSportsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            }
        });
        
        const data = response.data;
        
        // 받아온 실제 JSON 데이터를 본 어플리케이션 규격으로 파싱 및 매핑
        const realTimeData = {
            gameStatus: data.status || 'LIVE',
            inning: data.inning || 8,
            isInningTop: data.inningType === 'TOP',
            awayTeam: data.awayTeamName || 'KIA',
            homeTeam: data.homeTeamName || '삼성',
            awayScore: parseInt(data.awayScore) || 0,
            homeScore: parseInt(data.homeScore) || 0,
            awayHits: parseInt(data.awayHits) || 0,
            homeHits: parseInt(data.homeHits) || 0,
            awayErrors: parseInt(data.awayErrors) || 0,
            homeErrors: parseInt(data.homeErrors) || 0,
            awayBB: parseInt(data.awayBB) || 0,
            homeBB: parseInt(data.homeBB) || 0,
            
            balls: parseInt(data.ballCount) || 0,
            strikes: parseInt(data.strikeCount) || 0,
            outs: parseInt(data.outCount) || 0,
            runners: {
                first: !!data.runner1B,
                second: !!data.runner2B,
                third: !!data.runner3B
            },
            pitcher: data.currentPitcherName || '제임스 네일',
            batter: data.currentBatterName || '구자욱',
            pitchSpeed: data.lastPitchSpeed || 0,
            pitches: (data.pitches || []).map(p => ({
                x: p.coordinateX,
                y: p.coordinateY,
                type: p.resultType
            })),
            lastCommentary: data.lastCommentaryText || '',
            commentaryHistory: (data.relayTexts || []).map(t => ({
                time: t.inningStr,
                text: t.text,
                highlight: t.isHighlight
            }))
        };
        
        res.json(realTimeData);
    } catch (error) {
        console.error("실시간 KBO 데이터 크롤링 중 에러 발생, 시뮬레이터 데이터로 대체합니다:", error.message);
        res.json(simulatedMatchData);
    }
});

// 경기 일정 리스트 API - 실제 포털에서 오늘의 경기 리스트 동적 추출
app.get('/api/kbo/schedule', async (req, res) => {
    const { formatted, compact } = getKstDate();
    try {
        const url = `https://m.sports.naver.com/api/schedule/sports/kbo?date=${formatted}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const naverGames = response.data.games || [];
        if (naverGames.length === 0) {
            throw new Error("오늘 편성된 KBO 경기가 없습니다.");
        }
        
        const schedule = naverGames.map(g => {
            let statusText = '18:30 예정';
            if (g.state === 'RUNNING') {
                statusText = `${g.gameStage || '경기가열리는중'} 진행중`;
            } else if (g.state === 'AFTER') {
                statusText = '종료';
            } else if (g.state === 'CANCEL') {
                statusText = '우천취소';
            } else if (g.state === 'BEFORE') {
                statusText = g.gameTime || '18:30 예정';
            }
            
            return {
                id: g.gameId,
                away: g.awayTeamName,
                home: g.homeTeamName,
                score: g.state === 'BEFORE' ? 'VS' : `${g.awayScore} : ${g.homeScore}`,
                status: statusText,
                ballpark: g.stadiumName || 'KBO 야구장'
            };
        });
        res.json(schedule);
    } catch (error) {
        console.warn("실시간 일정을 가져올 수 없어 안전한 Mock 일정을 리턴합니다:", error.message);
        const fallbackSchedule = [
            { id: `${compact}KIASS0`, away: 'KIA', home: '삼성', score: `${simulatedMatchData.awayScore} : ${simulatedMatchData.homeScore}`, status: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'} 진행중`, ballpark: '대구 삼성라이온즈파크' },
            { id: `${compact}LGDO0`, away: 'LG', home: '두산', score: '2 : 2', status: '5회말 진행중', ballpark: '서울 잠실야구장' },
            { id: `${compact}HWLT0`, away: '한화', home: '롯데', score: 'VS', status: '18:30 예정', ballpark: '부산 사직야구장' },
            { id: `${compact}SSGKT0`, away: 'SSG', home: 'KT', score: 'VS', status: '18:30 예정', ballpark: '수원 KT위즈파크' }
        ];
        res.json(fallbackSchedule);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================================`);
    console.log(`🚀 KBO Live Match Center 백엔드 서버가 활성화되었습니다!`);
    console.log(`🌐 로컬 포트: http://localhost:${PORT}`);
    console.log(`📡 스마트폰 외부 접속 허용 (0.0.0.0 바인딩 완료)`);
    console.log(`==================================================================`);
});
