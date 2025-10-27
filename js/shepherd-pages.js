// Shared Shepherd initializers for pages (history, etc.)
(function(){
  function ensureShepherdLoaded() {
    return new Promise((resolve, reject) => {
      if (window.Shepherd) return resolve();
      const existing = document.querySelector('script[data-shepherd-loader]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Shepherd failed to load')));
        return;
      }
      const s = document.createElement('script');
      s.setAttribute('data-shepherd-loader', '1');
      s.src = 'https://cdn.jsdelivr.net/npm/shepherd.js/dist/js/shepherd.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Shepherd failed to load'));
      document.head.appendChild(s);
    });
  }

  // History page tour
  async function startHistoryTour(){
    try { await ensureShepherdLoaded(); } catch(err){ console.warn('Shepherd failed to load for history tour', err); return; }

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-default',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true }
      }
    });

    tour.addStep({ id: 'history-welcome', text: '過去の記録一覧の使い方を簡単に説明します。', buttons: [ { text: '次へ', action: tour.next } ] });

    if (document.getElementById('historyControls')) {
      tour.addStep({ id: 'history-controls', text: 'ここで日付や種類、キーワードで記録を絞り込めます。', attachTo: { element: '#historyControls', on: 'bottom' }, buttons: [ { text: '次へ', action: tour.next } ] });
    }

    if (document.getElementById('historyList')) {
      tour.addStep({ id: 'history-list', text: 'フィルタ後の結果はここに表示されます。各行をクリックすると詳細を見られます。', attachTo: { element: '#historyList', on: 'top' }, buttons: [ { text: '終了', action: tour.complete } ] });
    }

    tour.on('complete', () => localStorage.setItem('matoma_seen_tour_history_v1','1'));
    tour.on('cancel', () => localStorage.setItem('matoma_seen_tour_history_v1','1'));

    tour.start();
  }

  // Auto-start hooks for history (filter) and team (create-room) remain separate.
  // Single tutorial button handler: choose the appropriate tour based on page contents
  document.addEventListener('DOMContentLoaded', ()=>{
    const tutorialBtn = document.getElementById('tutorialBtn');
    if (tutorialBtn) {
      tutorialBtn.addEventListener('click', ()=>{
        // prefer page-specific tour
        if (document.getElementById('createRoomBtn')) {
          startTeamTour();
        } else if (document.getElementById('historyList') || document.getElementById('historyControls')) {
          startHistoryTour();
        } else {
          // fallback: start history tour if nothing else matched
          startHistoryTour();
        }
      });
    }

    const filterBtn = document.getElementById('applyFiltersBtn');
    if (filterBtn && !localStorage.getItem('matoma_seen_tour_history_v1')){
      filterBtn.addEventListener('click', ()=>{
        setTimeout(()=>{ if (!localStorage.getItem('matoma_seen_tour_history_v1')) startHistoryTour(); }, 200);
      }, { once: true });
    }
  });

  window.startHistoryTour = startHistoryTour;
  
  // Team page tour
  async function startTeamTour(){
    try { await ensureShepherdLoaded(); } catch(err){ console.warn('Shepherd failed to load for team tour', err); return; }

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-default',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true }
      }
    });

    tour.addStep({ id: 'team-welcome', text: '団体戦のセットアップとメンバー登録の流れを案内します。', buttons: [ { text: '次へ', action: tour.next } ] });

    if (document.getElementById('createRoomBtn')) {
      tour.addStep({ id: 'create-room', text: 'まずはルームを作成して共有できます。', attachTo: { element: '#createRoomBtn', on: 'bottom' }, buttons: [ { text: '次へ', action: tour.next } ] });
    }

    if (document.getElementById('openRegisterModalBtn')) {
      tour.addStep({ id: 'register', text: 'メンバー登録ボタンから新しい参加者を登録できます。', attachTo: { element: '#openRegisterModalBtn', on: 'left' }, buttons: [ { text: '次へ', action: tour.next } ] });
    }

    if (document.getElementById('teamsContainer')) {
      tour.addStep({ id: 'teams', text: 'ここにチームカードが表示されます。', attachTo: { element: '#teamsContainer', on: 'top' }, buttons: [ { text: '完了', action: tour.complete } ] });
    }

    tour.on('complete', () => localStorage.setItem('matoma_seen_tour_team_v1','1'));
    tour.on('cancel', () => localStorage.setItem('matoma_seen_tour_team_v1','1'));

    tour.start();
  }

  // Auto-start on first create-room (team)
  document.addEventListener('DOMContentLoaded', ()=>{
    const createBtn = document.getElementById('createRoomBtn');
    if (createBtn && !localStorage.getItem('matoma_seen_tour_team_v1')){
      createBtn.addEventListener('click', ()=>{ setTimeout(()=>{ if (!localStorage.getItem('matoma_seen_tour_team_v1')) startTeamTour(); }, 200); }, { once: true });
    }
  });

  window.startTeamTour = startTeamTour;
})();
