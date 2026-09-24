import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, UploadCloud, X } from 'lucide-react';
import { api, compressImage, uploadToStorage } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { CollectionSelect, Field, FormError, Modal } from './ui.jsx';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const PER_PRODUCT = [1, 2, 3, 4, 5, 6];

/**
 * Batch uploader.
 *
 * Grouping: images are chunked by `imagesPerProduct` in the order shown.
 * If the count does not divide evenly, the remainder becomes one final product
 * with fewer images — nothing is ever dropped, and the calculator says so
 * before you commit.
 *
 * Order of operations matters for integrity: every image is uploaded to storage
 * FIRST, then a single API call writes all products and image rows in one
 * database batch. A failed upload therefore never produces a half-built product,
 * and a failed database write leaves only orphaned files, not broken records.
 */
export default function AddProducts({ open, onClose, overview, reload, defaultCollectionId }) {
  const { signalChange, toast } = useStore();
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? null);
  const [perProduct, setPerProduct] = useState(1);
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);       // {file, preview, width, height, progress}
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);     // status line while working
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const adminCollections = overview?.collections?.filter((c) => !c.deleted) ?? [];

  const addFiles = useCallback(async (list) => {
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const rejected = Array.from(list).length - incoming.length;
    if (rejected) toast(`${rejected} file${rejected === 1 ? ' was' : 's were'} skipped — images only.`, 'info');
    if (!incoming.length) return;

      const measured = await Promise.all(
      incoming.map(async (file) => ({ progress: 0, ...(await compressImage(file)) }))
    );

    setFiles((prev) => {
      // Cheap duplicate guard: same name + size + last modified.
      const seen = new Set(prev.map((f) => `${f.file.name}|${f.file.size}|${f.file.lastModified}`));
      const fresh = measured.filter((m) => !seen.has(`${m.file.name}|${m.file.size}|${m.file.lastModified}`));
      const dupes = measured.length - fresh.length;
      if (dupes) toast(`${dupes} duplicate image${dupes === 1 ? '' : 's'} skipped.`, 'info');
      return [...prev, ...fresh];
    });
  }, [toast]);

  const removeAt = (i) =>
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i]?.preview);
      return prev.filter((_, idx) => idx !== i);
    });

  const move = (i, dir) =>
    setFiles((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Groups hold INDEXES, not object references — the file objects are replaced
  // on every progress tick, so identity lookups would break mid-upload.
  const groups = useMemo(() => {
    const out = [];
    for (let i = 0; i < files.length; i += perProduct) {
      out.push(Array.from({ length: Math.min(perProduct, files.length - i) }, (_, k) => i + k));
    }
    return out;
  }, [files.length, perProduct]);

  const remainder = files.length % perProduct;

  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setPrice('');
    setTitle('');
    setPerProduct(1);
    setError(null);
    setStage(null);
  };

  const close = () => { if (!busy) { reset(); onClose(); } };

  const submit = async () => {
    setError(null);
    if (!collectionId) return setError('Choose the collection these pieces belong to.');
    if (!files.length) return setError('Add at least one image.');

    setBusy(true);
    try {
      // 1. presign
      setStage('Preparing secure upload links…');
      const { uploads } = await api.post('/admin/uploads/presign', {
        files: files.map((f) => ({ contentType: f.file.type, size: f.file.size })),
      });

      // 2. upload, four at a time so a big batch doesn't saturate the connection
      setStage(`Uploading ${files.length} image${files.length === 1 ? '' : 's'}…`);
      const stored = new Array(files.length);
      const queue = files.map((f, i) => ({ f, i }));
      const worker = async () => {
        while (queue.length) {
          const { f, i } = queue.shift();
          const res = await uploadToStorage(f.file, uploads[i], (p) => {
            setFiles((prev) => {
              const next = [...prev];
              if (next[i]) next[i] = { ...next[i], progress: p };
              return next;
            });
          });
          stored[i] = { ...res, width: f.width, height: f.height };
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));

      // 3. one transactional write
      setStage('Creating products…');
      const payload = {
        collectionId,
        price: price === '' ? null : Number(price),
        title: title.trim() || null,
        groups: groups.map((g) => g.map((idx) => stored[idx])),
      };
      const res = await api.post('/admin/products', payload);

      signalChange(res.revision);
      reload();
      toast(`${res.created} product${res.created === 1 ? '' : 's'} created — live on the site now.`, 'success');
      reset();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setStage(null);
    }
  };

  const overallProgress = files.length
    ? Math.round((files.reduce((a, f) => a + (f.progress || 0), 0) / files.length) * 100)
    : 0;

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Add products"
      footer={
        <>
          <button className="btn btn--ghost" onClick={close} disabled={busy}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={busy || !files.length || !collectionId}>
            {busy ? stage || 'Working…' : `Create ${groups.length} product${groups.length === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      <FormError message={error} />

      <div className="row">
        <Field label="Collection" id="apcol" hint="Sub-sub-collections appear indented.">
          <CollectionSelect id="apcol" collections={adminCollections} value={collectionId} onChange={setCollectionId} />
        </Field>
        <Field label="Images per product" id="apper" hint="Images are grouped in the order shown below.">
          <select className="select" id="apper" value={perProduct} onChange={(e) => setPerProduct(Number(e.target.value))}>
            {PER_PRODUCT.map((n) => (
              <option key={n} value={n}>{n} image{n === 1 ? '' : 's'} per product</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="row">
        <Field label="Price (optional)" id="approce" hint="Leave blank for “price on request”.">
          <input
            id="approce"
            className="input"
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 12500"
          />
        </Field>
        <Field label="Title (optional)" id="aptitle" hint="Applied to every product in this batch.">
          <input id="aptitle" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gold Jhumka" />
        </Field>
      </div>

      <div
        className={`drop${over ? ' is-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
      >
        <div className="drop__icon"><ImagePlus size={20} /></div>
        <h3>Drop photographs here, or tap to choose</h3>
        <p>JPG, PNG, WebP or AVIF · up to 25 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="calc">
            <div className="calc__cell"><b>{files.length}</b><span>Images selected</span></div>
            <div className="calc__cell"><b>{perProduct}</b><span>Images per product</span></div>
            <div className="calc__cell"><b>{groups.length}</b><span>Products to create</span></div>
          </div>

          {remainder > 0 && (
            <div className="warn">
              <UploadCloud size={16} style={{ flex: 'none', marginTop: 1 }} />
              <div>
                {files.length} does not divide evenly by {perProduct}. The last product will be created with{' '}
                <strong>{remainder} image{remainder === 1 ? '' : 's'}</strong> instead of {perProduct}. No image is discarded.
              </div>
            </div>
          )}

          {busy && (
            <div className="progress" aria-label={`Upload progress ${overallProgress}%`}>
              <i style={{ width: `${overallProgress}%` }} />
            </div>
          )}

          <div className="previews">
            {files.map((f, i) => (
              <div className="preview" key={`${f.file.name}-${i}`}>
                <img src={f.preview} alt={`Selected image ${i + 1}`} />
                <span className="preview__n">#{Math.floor(i / perProduct) + 1}</span>
                {!busy && (
                  <>
                    <button className="preview__x" onClick={() => removeAt(i)} aria-label={`Remove image ${i + 1}`}>
                      <X size={12} />
                    </button>
                    <div className="preview__move">
                      <button onClick={() => move(i, -1)} aria-label="Move earlier"><ChevronLeft size={12} /></button>
                      <button onClick={() => move(i, 1)} aria-label="Move later"><ChevronRight size={12} /></button>
                    </div>
                  </>
                )}
                {busy && (
                  <div className="preview__bar"><i style={{ width: `${Math.round((f.progress || 0) * 100)}%` }} /></div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
