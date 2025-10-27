// font-size.js - 文字サイズ調整機能の共通実装

// フォントサイズの設定値と、それに対応する最適なコンテナの最大幅
const FONT_SIZES = {
    'small': {
        base: '14px',
        scale: 0.875,
        // 文字が小さい場合は、最大幅を広くして情報量を増やす
        maxContainerWidth: '72rem' // 例: Tailwind 'max-w-6xl'
    },
    'medium': {
        base: '16px',
        scale: 1,
        // 標準の最大幅
        maxContainerWidth: '64rem' // 例: Tailwind 'max-w-5xl'
    },
    'large': {
        base: '18px',
        scale: 1.125,
        // 文字が大きい場合、行の長さを短くして可読性を向上
        maxContainerWidth: '56rem' // 例: Tailwind 'max-w-4xl'
    },
    'x-large': {
        base: '20px',
        scale: 1.25,
        // 文字が非常に大きい場合、行の長さをさらに短くする
        maxContainerWidth: '48rem' // 例: Tailwind 'max-w-3xl'
    }
};

// 文字サイズを設定して保存する関数
function applyFontSize(sizeKey) {
    if (!FONT_SIZES[sizeKey]) {
        sizeKey = 'medium'; // デフォルトサイズ
    }

    const size = FONT_SIZES[sizeKey];
    const html = document.documentElement;
    
    // ベースフォントサイズを設定
    html.style.fontSize = size.base;
    
    // スケール値をCSS変数として設定
    html.style.setProperty('--font-scale', size.scale);
    
    // NEW: 最大コンテナ幅をCSS変数として設定
    html.style.setProperty('--max-container-width', size.maxContainerWidth);
    
    // 現在のサイズを data 属性として設定（CSSで selectors に利用）
    try {
        html.setAttribute('data-font-size', sizeKey);
    } catch (e) {
        // セット失敗しても処理継続
        console.warn('data-font-size set failed', e);
    }
    
    // Tailwind のテキストクラスをオーバーライド
    const style = document.createElement('style');
    // NOTE: font-scale を利用してすべてのフォントサイズを相対的に調整
    style.textContent = `
        .text-xs { font-size: calc(0.75rem * var(--font-scale)) !important; }
        .text-sm { font-size: calc(0.875rem * var(--font-scale)) !important; }
        .text-base { font-size: calc(1rem * var(--font-scale)) !important; }
        .text-lg { font-size: calc(1.125rem * var(--font-scale)) !important; }
        .text-xl { font-size: calc(1.25rem * var(--font-scale)) !important; }
        .text-2xl { font-size: calc(1.5rem * var(--font-scale)) !important; }
        .text-3xl { font-size: calc(1.875rem * var(--font-scale)) !important; }
        .text-4xl { font-size: calc(2.25rem * var(--font-scale)) !important; }
    `;
    
    // 既存のスタイルを更新または追加
    const existingStyle = document.getElementById('font-size-style');
    if (existingStyle) {
        existingStyle.remove();
    }
    style.id = 'font-size-style';
    document.head.appendChild(style);
    
    // 設定を保存
    localStorage.setItem('fontSize', sizeKey);
}

// 保存された文字サイズ設定を読み込む関数
function loadFontSize() {
    const savedSize = localStorage.getItem('fontSize');
    applyFontSize(savedSize || 'medium');
}

// 設定画面でのフォントサイズ変更をハンドリング
function handleFontSizeChange(event) {
    const newSize = event.target.value;
    applyFontSize(newSize);
    
    // NOTE: settings.html のスクリプトが持つ "textSize" 保存処理と競合しないよう、
    // ここで localStorage に保存する必要はないが、念のため残す
    localStorage.setItem('textSize', newSize); 
}

// グローバルに関数を公開
window.applyFontSize = applyFontSize;
window.handleFontSizeChange = handleFontSizeChange;

// ページ読み込み時に文字サイズを適用
document.addEventListener('DOMContentLoaded', () => {
    loadFontSize();
    
    // settings.htmlでの設定変更をハンドリング
    // settings.html のスクリプトでリスナーが重複しないように注意してください
    const textSizeSelect = document.getElementById('textSizeSelect');
    if (textSizeSelect) {
        // settings.html 側の重複リスナーを削除/コメントアウトし、こちらを使う
        textSizeSelect.addEventListener('change', handleFontSizeChange);
        
        // 初期選択値をLocalStorageから取得した値に設定
        const savedSize = localStorage.getItem('fontSize') || 'medium';
        textSizeSelect.value = savedSize;
    }
});