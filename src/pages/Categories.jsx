import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import TopBar from '../components/TopBar';

const ICONS = [
  'category', 'restaurant', 'commute', 'shopping_bag', 'bolt', 'local_hospital',
  'movie', 'flight', 'school', 'work', 'payments', 'savings', 'home', 'fitness_center',
  'pets', 'child_care', 'sports_esports', 'local_cafe', 'local_bar', 'spa',
  'car_repair', 'phone_android', 'laptop', 'music_note', 'book',
];

const COLORS = [
  '#004ac6', '#006c49', '#ac0031', '#ea580c', '#7c3aed',
  '#d97706', '#dc2626', '#db2777', '#0891b2', '#059669',
  '#737686', '#1d4ed8', '#065f46', '#92400e', '#4c1d95',
];

const EMPTY_FORM = { name: '', icon: 'category', color: '#004ac6', type: 'expense' };

export default function Categories({ onMenuClick }) {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [editCat, setEditCat] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState('all');

  const filtered = categories.filter((c) =>
    filterType === 'all' || c.type === filterType
  );

  const handleEdit = (cat) => {
    setEditCat(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditCat(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editCat?.id) {
      await updateCategory(editCat.id, form);
    } else {
      await addCategory(form);
    }
    setShowForm(false);
    setEditCat(null);
  };

  const handleDelete = async (cat) => {
    if (cat.isDefault) {
      alert('Стандартні категорії не можна видалити.');
      return;
    }
    if (window.confirm(`Видалити категорію "${cat.name}"?`)) {
      await deleteCategory(cat.id);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--outline-variant)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--on-surface)',
    background: 'white',
    outline: 'none',
    fontFamily: 'Inter',
  };

  return (
    <>
      <TopBar title="Категорії" onMenuClick={onMenuClick} />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'income', 'expense'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '7px 16px', borderRadius: 20, border: '1px solid',
                  borderColor: filterType === t ? 'var(--primary)' : 'var(--outline-variant)',
                  background: filterType === t ? 'var(--primary)' : 'white',
                  color: filterType === t ? 'white' : 'var(--on-surface-variant)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                {t === 'all' ? 'Всі' : t === 'income' ? 'Доходи' : 'Витрати'}
              </button>
            ))}
          </div>
          <button
            onClick={handleNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: 'var(--primary)', color: 'white',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Нова категорія
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <p style={{ color: 'var(--on-surface-variant)' }}>Завантаження...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {filtered.map((cat) => (
              <div
                key={cat.id}
                className="whisper-shadow"
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  border: '1px solid var(--outline-variant)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: cat.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: cat.color }}>
                      {cat.icon}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleEdit(cat)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, borderRadius: 6, display: 'flex',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-container)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--outline)' }}>edit</span>
                    </button>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDelete(cat)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 4, borderRadius: 6, display: 'flex',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error-container)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{cat.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 11, fontWeight: 600,
                      background: cat.type === 'income' ? '#dcfce7' : '#fee2e2',
                      color: cat.type === 'income' ? 'var(--secondary)' : 'var(--tertiary)',
                    }}>
                      {cat.type === 'income' ? 'Дохід' : 'Витрата'}
                    </span>
                    {cat.isDefault && (
                      <span style={{ fontSize: 10, color: 'var(--outline)', fontWeight: 500 }}>стандартна</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(19,27,46,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="whisper-shadow" style={{
            background: 'white', borderRadius: 20, padding: 32,
            width: '100%', maxWidth: 480, border: '1px solid var(--outline-variant)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontFamily: 'Manrope', fontSize: 20, fontWeight: 700, color: 'var(--on-surface)' }}>
                {editCat ? 'Редагувати категорію' : 'Нова категорія'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>close</span>
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-container-low)', borderRadius: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: form.color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: form.color }}>{form.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>{form.name || 'Назва категорії'}</div>
                  <div style={{ fontSize: 12, color: 'var(--outline)' }}>{form.type === 'income' ? 'Дохід' : 'Витрата'}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
                  Назва
                </label>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Назва категорії"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 6 }}>
                  Тип
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['expense', 'income'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: '1px solid',
                        borderColor: form.type === t ? (t === 'income' ? 'var(--secondary)' : 'var(--tertiary)') : 'var(--outline-variant)',
                        background: form.type === t ? (t === 'income' ? '#dcfce7' : '#fee2e2') : 'white',
                        color: form.type === t ? (t === 'income' ? 'var(--secondary)' : 'var(--tertiary)') : 'var(--on-surface-variant)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      {t === 'income' ? '↑ Дохід' : '↓ Витрата'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 8 }}>
                  Іконка
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: '1px solid',
                        borderColor: form.icon === icon ? form.color : 'var(--outline-variant)',
                        background: form.icon === icon ? form.color + '20' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: form.icon === icon ? form.color : 'var(--outline)' }}>
                        {icon}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 8 }}>
                  Колір
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: color, border: form.color === color ? '3px solid var(--on-surface)' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Власний колір"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: '1px solid var(--outline-variant)', background: 'white',
                    color: 'var(--on-surface)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: 'none', background: 'var(--primary)',
                    color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
