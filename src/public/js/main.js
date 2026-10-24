// Auto-hide alerts
document.addEventListener('DOMContentLoaded', function() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-4px)';
      alert.style.transition = 'all 0.2s ease';
      setTimeout(() => alert.remove(), 200);
    }, 4000);
  });

  // Modal close on escape (excepto sicocModal)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(m => {
        if (m.id !== 'sicocModal') m.style.display = 'none';
      });
    }
  });

  // Modal close on backdrop click (excepto sicocModal)
  document.querySelectorAll('.modal').forEach(modal => {
    if (modal.id === 'sicocModal') return;
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.style.display = 'none';
    });
  });
});
