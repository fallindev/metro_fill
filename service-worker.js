const CACHE_NAME = 'metronome-cache-v1'; // 캐시 버전. 내용 변경 시 숫자를 올려주세요.
const urlsToCache = [
    './', // 루트 경로 (index.html 포함)
    './index.html',
    './style.css',
    './script.js',
    './metronome-click.mp3',
    // PWA 아이콘 파일들도 캐시 목록에 추가
    './icon-192x192.png',
    './icon-512x512.png'
];

// 서비스 워커 설치 이벤트: 필요한 자원들을 캐시에 저장
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 서비스 워커 요청 가로채기 이벤트: 캐시에서 자원을 먼저 찾아보고, 없으면 네트워크에서 가져옴
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 캐시에 있으면 캐시된 응답 반환
                if (response) {
                    return response;
                }
                // 캐시에 없으면 네트워크에서 요청
                return fetch(event.request);
            })
    );
});

// 서비스 워커 활성화 이벤트: 오래된 캐시 삭제
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName); // 현재 버전이 아닌 캐시는 삭제
                    }
                })
            );
        })
    );
});