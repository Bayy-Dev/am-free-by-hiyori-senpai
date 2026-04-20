// ── APP.JS ──
// Entry point & logika claim
// Note: riwayatPollInterval didefinisikan di ui.js

async function doClaim() {
  const user = getLoggedInUser();

  // Harus login dulu
  if (!user) {
    showAuthModal(() => doClaim());
    return;
  }

  const claimed = await hasUserClaimed();
  if (claimed) {
    showToast('Kamu sudah pernah claim!', 'error');
    return;
  }

  const btn = document.getElementById('btn-claim-main');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Memproses...';
  }

  await new Promise(r => setTimeout(r, 900));

  const result = await doClaimAPI(getDeviceId(), user.id, user.username);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '⚡ Claim Sekarang';
  }

  if (result.error === 'already_claimed') {
    showToast('Kamu sudah pernah claim!', 'error');
    await renderDashboard();
    return;
  }

  if (result.error === 'cooldown') {
    showToast(result.message || 'Masih cooldown, tunggu dulu!', 'error');
    return;
  }

  if (result.error === 'stok_habis') {
    showToast('Stok habis!', 'error');
    await renderDashboard();
    return;
  }

  if (!result.ok) {
    showToast('Terjadi kesalahan, coba lagi.', 'error');
    return;
  }

  // ── ANIMASI CLAIM BERHASIL ──
  showToast('Berhasil claim akun! 🎉');
  await updateStats();

  // Tampilkan card hasil claim dengan animasi pop-in
  const heroEl = document.getElementById('hero-section');
  heroEl.innerHTML = buildClaimCardHTML(result.claimData, true);

  // Setelah 3.5 detik → animasi keluar
  setTimeout(() => {
    const card = heroEl.querySelector('.account-result');
    if (card) {
      card.classList.add('pop-out');
      setTimeout(() => {
        // Setelah animasi keluar → tampilkan banner "cek riwayat"
        heroEl.innerHTML = buildClaimedBannerHTML();
      }, 450);
    }
  }, 3500);
}

// ── INIT ──
(async function init() {
  if (getAdminSession()) {
    isAdminLoggedIn = true;
  }
  renderTopbarUser();
  await renderDashboard();
})();

// ── Polling cek revoke akses (setiap 30 detik) ──
let _aksesCheckInterval = null;

function startAksesPolling() {
  if (_aksesCheckInterval) clearInterval(_aksesCheckInterval);
  _aksesCheckInterval = setInterval(async () => {
    const user = getLoggedInUser();
    if (!user || user.role === 'admin') return;

    const status = await checkUserAkses(user.id);
    if (!status) return;

    // Cek expired
    if (status.isExpired) {
      clearInterval(_aksesCheckInterval);
      logoutUser();
      renderTopbarUser();
      renderDashboard();
      showRevokeAlert('expired');
      return;
    }

    // Cek isActive — kalau dinonaktifkan, logout paksa
    if (!status.isActive) {
      clearInterval(_aksesCheckInterval);
      logoutUser();
      renderTopbarUser();
      renderDashboard();
      showRevokeAlert('status');
      return;
    }

    // Cek noLimit — kalau dicabut dan user punya noLimit di cache
    const cachedNoLimit = user.noLimit;
    if (cachedNoLimit && !status.noLimit) {
      // Update cache
      const updated = { ...user, noLimit: false };
      setLoggedInUser(updated);
      showRevokeAlert('akses');
    }
  }, 30000);
}

function showRevokeAlert(type) {
  let el = document.getElementById('revoke-alert-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'revoke-alert-overlay';
    el.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;
      align-items:center;justify-content:center;z-index:9999;
    `;
    document.body.appendChild(el);
  }

  const isStatus  = type === 'status';
  const isExpired = type === 'expired';
  const icon  = isExpired ? '⏰' : isStatus ? '🚫' : '😤';
  const title = isExpired ? 'AKUN KAMU SUDAH EXPIRED' : isStatus ? 'AKUNMU DINONAKTIFKAN' : 'AKSES LU UDH DIHAPUS BG';
  const desc  = isExpired
    ? 'Masa aktif akunmu sudah habis.<br>Hubungi <strong style="color:#a78bfa">Admin Yori</strong> untuk perpanjangan.'
    : isStatus
      ? 'Akunmu telah dinonaktifkan oleh admin.<br>Hubungi <strong style="color:#a78bfa">Admin Yori</strong> untuk info lebih lanjut.'
      : 'No Limit lu udh dicabut sama admin.<br>Minta lagi sana ama <strong style="color:#a78bfa">Admin Yori</strong>! 😂';
  el.innerHTML = `
    <div style="
      background:var(--card-bg,#1e1e2e);border-radius:16px;padding:32px 28px;
      max-width:340px;width:90%;text-align:center;
      box-shadow:0 8px 32px rgba(0,0,0,.6);
      border:1px solid rgba(239,68,68,0.3);
    ">
      <div style="font-size:48px;margin-bottom:12px;">${icon}</div>
      <div style="font-size:15px;font-weight:800;color:#ef4444;margin-bottom:10px;letter-spacing:.5px;">${title}</div>
      <div style="font-size:13px;color:var(--text-secondary,#aaa);line-height:1.6;margin-bottom:24px;">${desc}</div>
      <button onclick="document.getElementById('revoke-alert-overlay').style.display='none'" style="
        background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;
        border:none;border-radius:10px;padding:10px 28px;font-size:14px;
        font-weight:600;cursor:pointer;width:100%;
      ">Oke Bos</button>
    </div>
  `;
  el.style.display = 'flex';
}

// Start polling saat user login
(function initAksesPolling() {
  const user = getLoggedInUser();
  if (user && user.role !== 'admin') startAksesPolling();
})();
