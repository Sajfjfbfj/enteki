/**
 * team.js - チーム管理とFirebase連携のメインロジック
 * 【役割】ルーム画面のロジック、入力チェック、Firebaseデータ操作との橋渡し
 * firebase-room.jsと連携して動作
 * team.html から ルーム関連の画面操作ロジックを移動
 */

(function() {
  'use strict';

  // グローバル変数 (non-module.js と共有される)
  window.currentRoom = window.currentRoom || null;
  let currentRoomListener = null;

  // DOM要素のキャッシュ
  let roomHistoryList;
  
  // =======================================================
  // 初期化 (DOMContentLoaded)
  // =======================================================
  document.addEventListener('DOMContentLoaded', () => {
    roomHistoryList = document.getElementById('roomHistoryList');

    // shareRoomBtnMenu のイベントリスナーは team.js で定義する
    document.getElementById('shareRoomBtnMenu')?.addEventListener('click', () => { 
        window.toggleMenu(false); // non-module.js の関数を呼び出す
        window.showShareRoomModal(); // team.js の関数を呼び出す
    });
  });
  
  /* ====== team.html から移動した ルーム操作ロジック ====== */

  // 1. ルーム作成 (UI操作ロジック)
  window.createNewRoom = function() {
    const input = document.getElementById('newRoomName');
    const roomName = input?.value.trim();
    
    if (!roomName) {
      alert('ルーム名を入力してください');
      return;
    }
    
    // window.doCreateRoom は firebase-room.js で定義されている想定
    if (window.doCreateRoom) {
      window.doCreateRoom(roomName).then(() => {
        if (input) input.value = '';
        window.hideJoinRoomModal(); // non-module.js の関数を呼び出す
        window.showShareRoomModal(); // team.js の関数を呼び出す
      }).catch(err => {
        console.error("ルーム作成エラー:", err);
        alert('ルーム作成に失敗しました: ' + err.message);
      });
    } else {
      alert('Firebase接続を確認してください');
    }
  };

  // 2. 既存ルームに参加 (UI操作ロジック)
  window.joinExistingRoom = function() {
    const input = document.getElementById('joinRoomId');
    const roomId = input?.value.trim().toUpperCase();
    
    if (!roomId) {
      alert('ルームIDを入力してください');
      return;
    }
    
    // window.joinTeamMatch は firebase-room.js で定義されている想定
    if (window.joinTeamMatch) {
      window.joinTeamMatch(roomId).then(() => {
        if (input) input.value = '';
        window.hideJoinRoomModal(); // non-module.js の関数を呼び出す
      }).catch(err => {
        console.error("ルーム参加エラー:", err);
        alert('ルームへの参加に失敗しました: ' + (err.message || "存在しないIDの可能性があります。"));
      });
    } else {
      alert('Firebase接続を確認してください');
    }
  };

  // 3. プレイヤー登録関数 (UI操作ロジック)
  window.registerAsPlayer = function() {
    const nameInput = document.getElementById('playerName');
    const roleSelect = document.getElementById('playerRoleSelect');
    const teamSelect = document.getElementById('playerTeamSelect');

    const playerName = nameInput?.value.trim();
    const playerRole = roleSelect?.value;
    const playerTeamId = teamSelect?.value;
    
    if (!playerName) {
      alert('名前を入力してください');
      return;
    }
    
    if (!window.currentRoom) {
      alert('先にルームに参加または作成してください。');
      return;
    }
    
    if (!playerTeamId) {
        alert('所属チームを選択してください。');
        return;
    }
    
    // window.addPlayerToRoom は firebase-room.js で定義されている想定
    if (window.addPlayerToRoom) {
      window.addPlayerToRoom(window.currentRoom.id, playerName, playerRole, playerTeamId).then(() => {
        alert(`役割「${playerRole === 'manager' ? '監督者' : playerRole === 'player' ? 'プレイヤー' : '観戦者'}」としてチーム登録が完了しました！`);
        if (nameInput) nameInput.value = '';
        window.hideManageRoomModal(); // non-module.js の関数を呼び出す
      }).catch(err => {
        console.error("登録エラー:", err);
        alert('登録に失敗しました: ' + err.message);
      });
    } else {
      alert('Firebase接続を確認してください');
    }
  };


  // 4. 共有モーダル表示時にURLを更新するロジック (UI/ルーム連携ロジック)
  window.showShareRoomModal = function() {
    // モーダルの開閉自体は non-module.js の汎用関数に任せる
    window.toggleModal('shareRoomModal', true); 
    
    if (window.currentRoom) {
      const url = `${location.origin}${location.pathname}#room=${window.currentRoom.id}`;
      const input = document.getElementById('shareUrl');
      if (input) input.value = url;
      
      // manageRoomModal内のID/Nameも更新
      const idSpan = document.getElementById('manageRoomId');
      const nameSpan = document.getElementById('manageRoomName');
      if (idSpan) idSpan.textContent = window.currentRoom.id;
      if (nameSpan) nameSpan.textContent = window.currentRoom.name;
    }
  };
  
  // 5. メニューボタンの有効化/無効化 (ルーム状態に依存する UI 制御)
  window.enableMenuButtons = function() {
    ['manageRoomBtnMenu', 'shareRoomBtnMenu', 'duplicateTeamBtnMenu'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  };

  window.disableMenuButtons = function() {
    ['manageRoomBtnMenu', 'shareRoomBtnMenu', 'duplicateTeamBtnMenu'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    });
  };

  // ... (既存のコード: renderRoom, attachRoomListener, processRoomUpdate などの Firebase 連携ロジック) ...
  // ... (既存のコード: addNewTeam など) ...

})();