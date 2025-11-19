/**
 * NextClip Website - Affiliate Tracking
 *
 * 웹사이트에서 어필리에이트 코드를 추적하고 저장합니다.
 * Extension 설치 후 이 데이터를 읽어갑니다.
 */

(function() {
    'use strict';

    const AFFILIATE_CONFIG = {
        cookieName: 'nextclip_ref',
        localStorageKey: 'nextclip_affiliate_code',
        urlParam: 'ref',
        expiryDays: 30
    };

    /**
     * URL에서 어필리에이트 코드 추출
     */
    function getAffiliateCodeFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get(AFFILIATE_CONFIG.urlParam);

            if (ref) {
                return sanitizeAffiliateCode(ref);
            }

            // Hash 파라미터도 확인
            const hash = window.location.hash;
            if (hash && hash.includes(AFFILIATE_CONFIG.urlParam)) {
                const hashParams = new URLSearchParams(hash.substring(1));
                const refFromHash = hashParams.get(AFFILIATE_CONFIG.urlParam);
                if (refFromHash) {
                    return sanitizeAffiliateCode(refFromHash);
                }
            }

            return null;
        } catch (error) {
            console.error('Error extracting affiliate code:', error);
            return null;
        }
    }

    /**
     * 어필리에이트 코드 검증
     */
    function sanitizeAffiliateCode(code) {
        if (!code || typeof code !== 'string') {
            return null;
        }

        const sanitized = code.trim().toUpperCase();
        const isValid = /^[A-Z0-9]{3,20}$/.test(sanitized);

        return isValid ? sanitized : null;
    }

    /**
     * 쿠키에 저장
     */
    function saveToCookie(code) {
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + AFFILIATE_CONFIG.expiryDays);

            const cookieValue = JSON.stringify({
                code: code,
                setAt: new Date().toISOString(),
                source: 'website'
            });

            document.cookie = `${AFFILIATE_CONFIG.cookieName}=${encodeURIComponent(cookieValue)}; expires=${expiryDate.toUTCString()}; path=/; domain=.nextclip.io; SameSite=Lax`;

            console.log('✅ Affiliate cookie saved:', code);
            return true;
        } catch (error) {
            console.error('Error saving cookie:', error);
            return false;
        }
    }

    /**
     * localStorage에 저장 (Extension이 읽을 수 있음)
     */
    function saveToLocalStorage(code) {
        try {
            const data = {
                code: code,
                setAt: new Date().toISOString(),
                source: 'website',
                expiresAt: new Date(Date.now() + AFFILIATE_CONFIG.expiryDays * 24 * 60 * 60 * 1000).toISOString()
            };

            localStorage.setItem(AFFILIATE_CONFIG.localStorageKey, JSON.stringify(data));

            console.log('✅ Affiliate code saved to localStorage:', code);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    /**
     * localStorage에서 읽기
     */
    function getFromLocalStorage() {
        try {
            const stored = localStorage.getItem(AFFILIATE_CONFIG.localStorageKey);

            if (!stored) {
                return null;
            }

            const data = JSON.parse(stored);

            // 만료 확인
            if (new Date(data.expiresAt) < new Date()) {
                localStorage.removeItem(AFFILIATE_CONFIG.localStorageKey);
                return null;
            }

            return data.code;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    /**
     * 쿠키에서 읽기
     */
    function getFromCookie() {
        try {
            const cookies = document.cookie.split(';');

            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');

                if (name === AFFILIATE_CONFIG.cookieName) {
                    const cookieData = JSON.parse(decodeURIComponent(value));
                    return cookieData.code;
                }
            }

            return null;
        } catch (error) {
            console.error('Error reading cookie:', error);
            return null;
        }
    }

    /**
     * 초기화
     */
    function init() {
        console.log('🎯 NextClip Affiliate Tracker initialized');

        // URL에서 어필리에이트 코드 확인
        const affiliateCode = getAffiliateCodeFromURL();

        if (affiliateCode) {
            console.log('🎯 Affiliate code detected:', affiliateCode);

            // 쿠키와 localStorage 모두에 저장
            saveToCookie(affiliateCode);
            saveToLocalStorage(affiliateCode);

            // URL 파라미터 제거 (깔끔하게)
            if (window.history && window.history.replaceState) {
                const url = new URL(window.location);
                url.searchParams.delete(AFFILIATE_CONFIG.urlParam);
                window.history.replaceState({}, '', url);
            }

            // 사용자에게 알림 (선택사항)
            showAffiliateNotification(affiliateCode);

        } else {
            // 기존에 저장된 코드 확인
            const existingCode = getFromLocalStorage() || getFromCookie();

            if (existingCode) {
                console.log('📌 Existing affiliate code:', existingCode);
            } else {
                console.log('ℹ️ No affiliate code found');
            }
        }
    }

    /**
     * 어필리에이트 알림 표시 (선택사항)
     */
    function showAffiliateNotification(code) {
        // 간단한 알림 (필요하면 활성화)
        // console.log(`🎉 You're using affiliate code: ${code} - Get special benefits!`);
    }

    /**
     * Extension 설치 링크에 어필리에이트 코드 포함
     */
    function updateInstallLinks() {
        const affiliateCode = getFromLocalStorage() || getFromCookie();

        if (!affiliateCode) {
            return;
        }

        // Chrome Web Store 링크 업데이트
        const installButtons = document.querySelectorAll('a[href*="chrome.google.com/webstore"]');

        installButtons.forEach(button => {
            const originalHref = button.getAttribute('href');

            // Extension ID 파라미터 포함
            // Extension 설치 후 자동으로 어필리에이트 코드 전달
            button.setAttribute('data-affiliate-code', affiliateCode);

            console.log('🔗 Updated install button with affiliate code');
        });
    }

    /**
     * Public API
     */
    window.NextClipAffiliate = {
        getCode: function() {
            return getFromLocalStorage() || getFromCookie();
        },
        hasCode: function() {
            return !!(getFromLocalStorage() || getFromCookie());
        },
        clear: function() {
            localStorage.removeItem(AFFILIATE_CONFIG.localStorageKey);
            document.cookie = `${AFFILIATE_CONFIG.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.nextclip.io`;
            console.log('✅ Affiliate data cleared');
        }
    };

    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            updateInstallLinks();
        });
    } else {
        init();
        updateInstallLinks();
    }

})();
