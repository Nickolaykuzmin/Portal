import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import TopBar from '../components/TopBar';
import type { Category, TransactionType } from '../types';
import s from './Categories.module.scss';

const ICONS: string[] = [
  'category', 'restaurant', 'commute', 'shopping_bag', 'bolt', 'local_hospital',
  'movie', 'flight', 'school', 'work', 'payments', 'savings', 'home', 'fitness_center',
  'pets', 'child_care', 'sports_esports', 'local_cafe', 'local_bar', 'spa',
  'car_repair', 'phone_android', 'laptop', 'music_note', 'book',
];

const COLORS: string[] = [
  '#004ac6', '#006c49', '#ac0031', '#ea580c', '#7c3aed',
  '#d97706', '#dc2626', '#db2777', '#0891b2', '#059669',
  '#737686', '#1d4ed8', '#065f46', '#92400e', '#4c1d95',
];

interface CategoryForm {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

const EMPTY_FORM: CategoryForm = { name: '', icon: 'category', color: '#004ac6', type: 'expense' };

interface CategoriesProps {
  onMenuClick?: () => void;
}

export default function Categories({ onMenuClick }: CategoriesProps) {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');

  const filtered = categories.filter((c) =>
    filterType === 'all' || c.type === filterType,
  );

  const handleEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditCat(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editCat?.id) {
      await updateCategory(editCat.id, form);
    } else {
      await addCategory(form);
    }
    setShowForm(false);
    setEditCat(null);
  };

  const handleDelete = async (cat: Category) => {
    if (cat.isDefault) {
      alert('Стандартні категорії не можна видалити.');
      return;
    }
    if (window.confirm(`Видалити категорію "${cat.name}"?`)) {
      await deleteCategory(cat.id);
    }
  };

  return (
    <>
      <TopBar title="Категорії" onMenuClick={onMenuClick} />
      <div className={s.page}>

        {/* Header */}
        <div className={s.pageHeader}>
          <div className={s.filterGroup}>
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`${s.filterBtn}${filterType === t ? ` ${s.active}` : ''}`}
              >
                {t === 'all' ? 'Всі' : t === 'income' ? 'Доходи' : 'Витрати'}
              </button>
            ))}
          </div>
          <button onClick={handleNew} className={s.newBtn}>
            <span className={`material-symbols-outlined ${s.icon}`}>add</span>
            Нова категорія
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <p className={s.loading}>Завантаження...</p>
        ) : (
          <div className={s.grid}>
            {filtered.map((cat) => (
              <div key={cat.id} className={`whisper-shadow ${s.catCard}`}>
                <div className={s.catCardTop}>
                  <div
                    className={s.catIconWrap}
                    style={{ background: cat.color + '20' }}
                  >
                    <span
                      className={`material-symbols-outlined ${s.icon}`}
                      style={{ color: cat.color }}
                    >
                      {cat.icon}
                    </span>
                  </div>
                  <div className={s.catCardActions}>
                    <button onClick={() => handleEdit(cat)} className={s.editBtn}>
                      <span className={`material-symbols-outlined ${s.icon}`}>edit</span>
                    </button>
                    {!cat.isDefault && (
                      <button onClick={() => handleDelete(cat)} className={s.deleteBtn}>
                        <span className={`material-symbols-outlined ${s.icon}`}>delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className={s.catName}>{cat.name}</div>
                  <div className={s.catMeta}>
                    <span className={`${s.typeBadge} ${cat.type === 'income' ? s.income : s.expense}`}>
                      {cat.type === 'income' ? 'Дохід' : 'Витрата'}
                    </span>
                    {cat.isDefault && <span className={s.defaultLabel}>стандартна</span>}
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
          className={s.overlay}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className={`whisper-shadow ${s.modal}`}>
            <div className={s.modalHeader}>
              <h2>{editCat ? 'Редагувати категорію' : 'Нова категорія'}</h2>
              <button onClick={() => setShowForm(false)} className={s.closeBtn}>
                <span className={`material-symbols-outlined ${s.icon}`}>close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className={s.form}>
              {/* Preview */}
              <div className={s.preview}>
                <div
                  className={s.previewIcon}
                  style={{ background: form.color + '20' }}
                >
                  <span
                    className={`material-symbols-outlined ${s.icon}`}
                    style={{ color: form.color }}
                  >
                    {form.icon}
                  </span>
                </div>
                <div>
                  <div className={s.previewName}>{form.name || 'Назва категорії'}</div>
                  <div className={s.previewType}>{form.type === 'income' ? 'Дохід' : 'Витрата'}</div>
                </div>
              </div>

              <div>
                <label className={s.fieldLabel}>Назва</label>
                <input
                  className={s.input}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Назва категорії"
                  required
                />
              </div>

              <div>
                <label className={s.fieldLabel}>Тип</label>
                <div className={s.typeToggle}>
                  {(['expense', 'income'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`${s.typeBtn} ${form.type === t ? s[t] : ''}`}
                    >
                      {t === 'income' ? '↑ Дохід' : '↓ Витрата'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={s.fieldLabel}>Іконка</label>
                <div className={s.iconGrid}>
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`${s.iconBtn}${form.icon === icon ? ` ${s.active}` : ''}`}
                      style={
                        form.icon === icon
                          ? { borderColor: form.color, background: form.color + '20' }
                          : undefined
                      }
                    >
                      <span
                        className={`material-symbols-outlined ${s.icon}`}
                        style={form.icon === icon ? { color: form.color } : undefined}
                      >
                        {icon}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={s.fieldLabel}>Колір</label>
                <div className={s.colorGrid}>
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color }))}
                      className={`${s.colorBtn}${form.color === color ? ` ${s.active}` : ''}`}
                      style={{ background: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className={s.colorInput}
                    title="Власний колір"
                  />
                </div>
              </div>

              <div className={s.formFooter}>
                <button type="button" onClick={() => setShowForm(false)} className={s.cancelBtn}>
                  Скасувати
                </button>
                <button type="submit" className={s.saveBtn}>
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
