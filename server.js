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

// ==========================================================================
// 2. REAL-TIME WEB SCRAPER ROUTE (네이버 스포츠 크롤링 예시)
// ==========================================================================
// 이 라우터는 네이버 실시간 야구 경기 데이터를 실제로 긁어올 수 있는 아키텍처 모델입니다.
// 실제 서비스에서는 외부 데이터 보호 정책(CORS, 로봇 배제 정책 등)을 고려해 적합한 상용 파싱 API를 활용하는 것을 권장합니다.
app.get('/api/kbo/live', async (req, res) => {
    const isMockMode = req.query.mock !== 'false';
    
    if (isMockMode) {
        // 기본 모드: 정교하게 돌아가는 지능형 백엔드 시뮬레이터 데이터 반환
        return res.json(simulatedMatchData);
    }
    
    // 실제 라이브 정보 크롤링 구현부 (사용자가 API mock 모드를 꺼두었을 때 동작)
    try {
        // 예시: 네이버 스포츠 모바일 중계 일정 리스트 또는 경기 세부 API 호출
        // 네이버 스포츠 모바일은 경기별로 고유 아이디를 가진 JSON API를 제공합니다.
        const matchId = req.query.matchId || '20260521KIASS0'; // KIA vs 삼성 경기 예시 ID
        const naverSportsUrl = `https://m.sports.naver.com/api/game/${matchId}/relay`; 
        
        const response = await axios.get(naverSportsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            }
        });
        
        const data = response.data;
        
        // 받아온 실제 JSON 데이터를 본 어플리케이션 규격으로 파싱 및 매핑
        const realTimeData = {
            gameStatus: data.status || 'LIVE', // 경기 상태 (BEFORE, LIVE, TIMEOUT, END)
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
            
            // 실시간 볼카운트 및 주자 상황 매핑
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
                type: p.resultType // 'strike', 'ball', 'hit'
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
        // 에러가 나면 안전한 폴백(Fallback)을 수행하여 사용자 화면이 안 나오거나 튕기는 불상사 원천 차단
        res.json(simulatedMatchData);
    }
});

// 경기 일정 리스트 API
app.get('/api/kbo/schedule', async (req, res) => {
    try {
        // 실제 KBO 오늘 일정을 파싱하기 위한 크롤링 목업
        const todaySchedule = [
            { id: '20260521KIASS0', away: 'KIA', home: '삼성', score: `${simulatedMatchData.awayScore} : ${simulatedMatchData.homeScore}`, status: `${simulatedMatchData.inning}회${simulatedMatchData.isInningTop ? '초' : '말'} 진행중`, ballpark: '대구 삼성라이온즈파크' },
            { id: '20260521LGD0', away: 'LG', home: '두산', score: '2 : 2', status: '5회말 진행중', ballpark: '서울 잠실야구장' },
            { id: '20260521HWLT0', away: '한화', home: '롯데', score: 'VS', status: '18:30 예정', ballpark: '부산 사직야구장' },
            { id: '20260521SSGKT0', away: 'SSG', home: 'KT', score: 'VS', status: '18:30 예정', ballpark: '수원 KT위즈파크' }
        ];
        res.json(todaySchedule);
    } catch (error) {
        res.status(500).json({ error: '일정을 가져오는데 실패했습니다.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================================`);
    console.log(`🚀 KBO Live Match Center 백엔드 서버가 활성화되었습니다!`);
    console.log(`🌐 로컬 포트: http://localhost:${PORT}`);
    console.log(`📡 스마트폰 외부 접속 허용 (0.0.0.0 바인딩 완료)`);
    console.log(`==================================================================`);
});
