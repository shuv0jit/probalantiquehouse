import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, RotateCcw, UploadCloud, X } from 'lucide-react';
import { api, compressImage, uploadToStorage } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { CollectionSelect, Field, FormError, Modal } from './ui.jsx';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const PER_PRODUCT = [1, 2, 3, 4, 5, 6];

/* ------------------------------------------------------------------ queue
 * Lives at module level, so jobs keep running when the modal closes.
 * Batches run one after another; inside a batch, 4 images upload at once. */
let jobs = [];
let nextId = 1;
let running = false;
const subs = new Set();
const emit = () => { jobs = [...jobs]; subs.forEach((f) => f()); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
const getJobs = () => jobs;
const patch = (job, p) => { Object.assign(job, p); emit(); };

const releaseJob = (job) => job.files.forEach((f) => URL.revokeObjectURL(f.preview));

const removeJob = (job) => {
  jobs = jobs.filter((j) => j !== job);
  emit();
};

async function runJob(job) {
  const { files, groups } = job;
  try {
    patch(job, { status: 'running', stage: 'Preparing upload…', pct: 0, error: null, cancelled: false });
    const { uploads: fullUploads } = await api.post('/admin/uploads/presign', {
      files: files.map((f) => ({ contentType: f.file.type, size: f.file.size })),
    });
    const { uploads: thumbUploads } = await api.post('/admin/uploads/presign', {
      files: files.map((f) => ({ contentType: f.thumbFile.type, size: f.thumbFile.size })),
    });

    const stored = new Array(files.length);
    const prog = new Array(files.length).fill(0);
    let uploaded = 0;
    const tick = () => {
      const pct = Math.round((prog.reduce((a, b) => a + b, 0) / files.length) * 90);
      if (pct !== job.pct || job.stage.startsWith('Uploading') === false) {
        patch(job, { stage: `Uploading ${uploaded}/${files.length} images`, pct });
      }
    };
    tick();

    const queue = files.map((f, i) => ({ f, i }));
    const worker = async () => {
      while (queue.length && !job.cancelled) {
        const { f, i } = queue.shift();
        const [full, thumb] = await Promise.all([
          uploadToStorage(f.file, fullUploads[i], (p) => { prog[i] = p * 0.7; tick(); }),
          uploadToStorage(f.thumbFile, thumbUploads[i], (p) => { prog[i] = 0.7 + p * 0.3; tick(); }),
        ]);
        prog[i] = 1;
        uploaded += 1;
        stored[i] = {
          url: full.url, key: full.key,
          thumbUrl: thumb.url, thumbKey: thumb.key,
          width: f.width, height: f.height,
        };
        tick();
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));

    if (job.cancelled) {
      releaseJob(job);
      removeJob(job);
      return;
    }

    patch(job, { stage: 'Creating products…', pct: 94 });
    const res = await api.post('/admin/products', {
      collectionId: job.collectionId,
      price: job.price,
      title: job.title,
      groups: groups.map((g) => g.map((idx) => stored[idx])),
    });

    patch(job, { status: 'done', stage: `${res.created} product${res.created === 1 ? '' : 's'} created`, pct: 100 });
    job.signalChange(res.revision);
    job.reload();
    job.toast(`${res.created} product${res.created === 1 ? '' : 's'} created, live on the site now.`, 'success');
    releaseJob(job);
    setTimeout(() => removeJob(job), 6000);
  } catch (err) {
    patch(job, { status: 'error', stage: 'Failed', error: err.message || 'Something went wrong.' });
  }
}

async function pump() {
  if (running) return;
  running = true;
  try {
    let job;
    while ((job = jobs.find((j) => j.status === 'queued'))) {
      await runJob(job);
    }
  } finally {
    running = false;
  }
}

function enqueue(data) {
  jobs = [...jobs, {
    id: nextId++, status: 'queued', stage: 'Waiting…', pct: 0, error: null, cancelled: false, ...data,
  }];
  emit();
  pump();
}

function retryJob(job) {
  patch(job, { status: 'queued', stage: 'Waiting…', pct: 0, error: null, cancelled: false });
  pump();
}

function cancelJob(job) {
  if (job.status === 'running') {
    job.cancelled = true;
    patch(job, { stage: 'Cancelling…' });
  } else {
    releaseJob(job);
    removeJob(job);
  }
}

function dismissJob(job) {
  releaseJob(job);
  removeJob(job);
}

/* -------------------------------------------------------------- status bar */
function StatusBar() {
  const list = useSyncExternalStore(subscribe, getJobs);
  if (!list.length) return null;
  const active = list.filter((j) => j.status === 'queued' || j.status === 'running').length;

  return (
    <div
      style={{
        position: 'fixed', right: 14, bottom: 14, zIndex: 130,
        width: 'min(380px, calc(100vw - 28px))', maxHeight: '55vh', overflowY: 'auto',
        background: 'var(--shell, #fff)', border: '1px solid var(--line)', borderRadius: 14,
        boxShadow: 'var(--sh-3)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', padding: '2px 4px' }}>
        {active ? `Background uploads · ${active} active` : 'Uploads finished'}
      </div>
      {list.map((j) => {
        const busy = j.status === 'running';
        const err = j.status === 'error';
        const done = j.status === 'done';
        return (
          <div key={j.id} style={{ background: 'var(--ivory-2)', borderRadius: 10, padding: '9px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {done ? <Check size={15} style={{ color: 'var(--sage, #5a9a6b)', flex: 'none' }} />
                : err ? <AlertCircle size={15} style={{ color: '#b8454b', flex: 'none' }} />
                : busy ? <Loader2 size={15} className="spin" style={{ flex: 'none', animation: 'spin 720ms linear infinite' }} />
                : <UploadCloud size={15} style={{ color: 'var(--ink-4)', flex: 'none' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {j.label}
                </div>
                <div style={{ fontSize: 11.5, color: err ? '#b8454b' : 'var(--ink-3)' }}>
                  {err ? j.error : j.status === 'queued' ? 'In queue, waiting for the previous batch' : j.stage}
                </div>
              </div>
              {err && (
                <button className="icon-btn" onClick={() => retryJob(j)} title="Retry" aria-label="Retry"><RotateCcw size={14} /></button>
              )}
              {(j.status === 'queued' || busy) && (
                <button className="icon-btn" onClick={() => cancelJob(j)} title="Cancel" aria-label="Cancel"><X size={14} /></button>
              )}
              {(err || done) && (
                <button className="icon-btn" onClick={() => dismissJob(j)} title="Dismiss" aria-label="Dismiss"><X size={14} /></button>
              )}
            </div>
            {(busy || done) && (
              <div style={{ height: 5, borderRadius: 99, background: '#fff', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${j.pct}%`, height: '100%', background: done ? 'var(--sage, #5a9a6b)' : 'var(--rose)', transition: 'width .3s ease' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- form */
export default function AddProducts({ open, onClose, overview, reload, defaultCollectionId }) {
  const { signalChange, toast } = useStore();
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? null);
  const [perProduct, setPerProduct] = useState(1);
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [over, setOver] = useState(false);
  const [error, setError] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const inputRef = useRef(null);

  const adminCollections = overview?.collections?.filter((c) => !c.deleted) ?? [];

  // pick up the current collection each time the window opens
  useEffect(() => {
    if (open && defaultCollectionId != null) setCollectionId(defaultCollectionId);
  }, [open, defaultCollectionId]);

  const addFiles = useCallback(async (list) => {
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const rejected = Array.from(list).length - incoming.length;
    if (rejected) toast(`${rejected} file${rejected === 1 ? ' was' : 's were'} skipped, images only.`, 'info');
    if (!incoming.length) return;

    setPreparing(true);
    try {
      const measured = await Promise.all(
        incoming.map(async (file) => {
          const full = await compressImage(file, { maxDim: 1600, quality: 0.82 });
          const thumb = await compressImage(file, { maxDim: 480, quality: 0.75 });
          return { file: full.file, thumbFile: thumb.file, width: full.width, height: full.height, preview: full.preview };
        })
      );
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => `${f.file.name}|${f.file.size}|${f.file.lastModified}`));
        const fresh = measured.filter((m) => !seen.has(`${m.file.name}|${m.file.size}|${m.file.lastModified}`));
        const dupes = measured.length - fresh.length;
        if (dupes) toast(`${dupes} duplicate image${dupes === 1 ? '' : 's'} skipped.`, 'info');
        return [...prev, ...fresh];
      });
    } finally {
      setPreparing(false);
    }
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

  const groups = useMemo(() => {
    const out = [];
    for (let i = 0; i < files.length; i += perProduct) {
      out.push(Array.from({ length: Math.min(perProduct, files.length - i) }, (_, k) => i + k));
    }
    return out;
  }, [files.length, perProduct]);

  const remainder = files.length % perProduct;

  // keepPreviews: true when the files were handed to the queue (it frees them itself)
  const reset = (keepPreviews = false) => {
    if (!keepPreviews) files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setPrice('');
    setTitle('');
    setPerProduct(1);
    setError(null);
  };

  const close = () => { reset(); onClose(); };

  const submit = () => {
    setError(null);
    if (!collectionId) return setError('Choose the collection these pieces belong to.');
    if (!files.length) return setError('Add at least one image.');

    const colName = adminCollections.find((c) => c.id === collectionId)?.name;
    enqueue({
      files,
      groups,
      collectionId,
      price: price === '' ? null : Number(price),
      title: title.trim() || null,
      label: `${groups.length} product${groups.length === 1 ? '' : 's'}${colName ? ` → ${colName}` : ''}`,
      reload,
      signalChange,
      toast,
    });
    toast('Added to the upload queue. You can keep adding more.', 'info');
    reset(true);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        wide
        title="Add products"
        footer={
          <>
            <button className="btn btn--ghost" onClick={close}>Cancel</button>
            <button className="btn btn--primary" onClick={submit} disabled={preparing || !files.length || !collectionId}>
              {preparing ? 'Preparing images…' : `Add ${groups.length} product${groups.length === 1 ? '' : 's'} to queue`}
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
            <input id="approce" className="input" type="number" min="0" step="1" value={price}
              onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 12500" />
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
          <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
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

            <div className="previews">
              {files.map((f, i) => (
                <div className="preview" key={`${f.file.name}-${i}`}>
                  <img src={f.preview} alt={`Selected image ${i + 1}`} />
                  <span className="preview__n">#{Math.floor(i / perProduct) + 1}</span>
                  <button className="preview__x" onClick={() => removeAt(i)} aria-label={`Remove image ${i + 1}`}>
                    <X size={12} />
                  </button>
                  <div className="preview__move">
                    <button onClick={() => move(i, -1)} aria-label="Move earlier"><ChevronLeft size={12} /></button>
                    <button onClick={() => move(i, 1)} aria-label="Move later"><ChevronRight size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      <StatusBar />
    </>
  );
}