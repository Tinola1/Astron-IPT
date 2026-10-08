import { useEffect, useState } from 'react';
import { api } from './api';

const php = (n) => '₱' + n.toLocaleString();
const BTU_OPTIONS = [6000, 9000, 12000, 18000, 24000, 36000];
const rating = (p) => parseFloat(p.specs.energyRating) || 0;

export default function App() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [store, setStore] = useState({});
  const [f, setF] = useState({ q: '', category: '', brand: '', inverter: '', maxPrice: '', rating: '' });
  const [sqm, setSqm] = useState(20);
  const [useRec, setUseRec] = useState(false);
  const [cart, setCart] = useState(0);
  const [cmp, setCmp] = useState([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const set = (k) => (e) => { setUseRec(false); setF({ ...f, [k]: e.target.value }); };

  useEffect(() => {
    Promise.all([api('/categories'), api('/brands'), api('/store-info')])
      .then(([c, b, s]) => { setCats(c); setBrands(b); setStore(s); })
      .catch((e) => setErr(e.message));
  }, []);

  // server-side filters; energy rating is filtered below
  const qs = new URLSearchParams(
    Object.entries(f).filter(([k, v]) => v && k !== 'rating')
  ).toString();
  useEffect(() => {
    setLoading(true);
    api('/products?' + qs).then((d) => { setProducts(d); setErr(''); })
      .catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [qs]);

  const recBtu = BTU_OPTIONS.find((o) => o >= sqm * 600) || 36000;
  const hp = { 6000: 0.6, 9000: 1, 12000: 1.5, 18000: 2, 24000: 2.5, 36000: 4 }[recBtu];
  const shown = products.filter((p) =>
    (!f.rating || rating(p) >= +f.rating) && (!useRec || p.specs.capacityBTU === recBtu));
  const toggle = (id) => setCmp((c) => c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c);
  const compared = products.filter((p) => cmp.includes(p._id));

  return (
    <>
      <div className="promo">Free delivery within Metro Manila on orders over ₱30,000. Installation add-on available at checkout.</div>
      {err && <div className="err" role="alert">Can't reach the store server: {err}. Is the backend running?</div>}
      <header><div className="wrap bar">
        <a className="logo" href="#">{store.storeName || 'Astron'}</a>
        <input type="search" placeholder="Search by model or brand" aria-label="Search products" value={f.q} onChange={set('q')} />
        <nav><button className="btn">Log in</button><button className="btn">Register</button>
          <button className="btn p">Cart ({cart})</button></nav>
      </div></header>

      <section className="hero"><div className="wrap">
        <div>
          <h1>The right aircon for your room, not just the biggest one.</h1>
          <p>Tell us your room size and we'll match the cooling capacity. Then compare units, add installation, and book a date at checkout.</p>
        </div>
        <div className="finder">
          <h2>Find my capacity</h2>
          <label htmlFor="sqm">Room size: {sqm} m²</label>
          <input id="sqm" type="range" min="6" max="70" value={sqm} onChange={(e) => setSqm(+e.target.value)} />
          <div className="res" aria-live="polite">Recommended: <strong>{recBtu.toLocaleString()} BTU</strong>
            <div className="stock">About {hp} HP for {sqm} m²</div>
            <button className="btn p" style={{ marginTop: 10 }} onClick={() => setUseRec(true)}>Show matching units</button>
          </div>
        </div>
      </div></section>

      <main className="wrap">
        <div className="cats" role="group" aria-label="Aircon type">
          <button className="chip" aria-pressed={!f.category} onClick={() => { setUseRec(false); setF({ ...f, category: '' }); }}>All types</button>
          {cats.map((c) => (
            <button key={c._id} className="chip" aria-pressed={f.category === c._id}
              onClick={() => { setUseRec(false); setF({ ...f, category: c._id }); }}>{c.name}</button>
          ))}
        </div>
        <div className="filters">
          <select aria-label="Brand" value={f.brand} onChange={set('brand')}>
            <option value="">All brands</option>{brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <select aria-label="Inverter" value={f.inverter} onChange={set('inverter')}>
            <option value="">Inverter or not</option><option value="true">Inverter</option><option value="false">Non-inverter</option>
          </select>
          <select aria-label="Energy rating" value={f.rating} onChange={set('rating')}>
            <option value="">Any energy rating</option><option value="5">5 stars</option><option value="4">4+ stars</option><option value="3">3+ stars</option>
          </select>
          <select aria-label="Price" value={f.maxPrice} onChange={set('maxPrice')}>
            <option value="">Any price</option><option value="20000">Up to ₱20,000</option><option value="35000">Up to ₱35,000</option><option value="60000">Up to ₱60,000</option>
          </select>
        </div>

        {loading && <p className="note">Loading units…</p>}
        <div className="grid">
          {!loading && !shown.length && <p className="empty">No units match these filters. Clear a filter to see more.</p>}
          {shown.map((p) => (
            <article className="card" key={p._id}>
              <div className="pic">{p.image ? <img src={p.image} alt="" style={{ maxHeight: 90 }} /> : (
                <svg width="64" height="40" viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <rect x="3" y="4" width="58" height="22" rx="5" /><path d="M12 32c3 4 7 4 10 0M27 32c3 4 7 4 10 0M42 32c3 4 7 4 10 0" /></svg>)}</div>
              <span className="brand">{p.brand} · {p.category}</span>
              <h3>{p.name}</h3>
              <div className="specs">
                <span className="tag">{(p.specs.capacityBTU || 0).toLocaleString()} BTU / {p.specs.capacityHP} HP</span>
                <span className="tag">{p.specs.isInverter ? 'Inverter' : 'Non-inverter'}</span>
                {p.specs.energyRating && <span className="tag">Energy {p.specs.energyRating}★</span>}
              </div>
              <div className="price">{php(p.price)}</div>
              <div className={'stock' + (p.available ? '' : ' out')}>
                {!p.available ? 'Out of stock' : p.onlineStock <= 3 ? `Only ${p.onlineStock} left` : 'In stock'}</div>
              <div className="row">
                <label><input type="checkbox" checked={cmp.includes(p._id)} onChange={() => toggle(p._id)} />Compare</label>
                <button className="btn p" disabled={!p.available} onClick={() => setCart(cart + 1)}>Add to cart</button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {cmp.length > 0 && (
        <div id="cmp" className="on">
          <span><b>{cmp.length}</b> selected</span>
          <button className="btn p" onClick={() => setOpen(true)}>Compare</button>
          <button className="btn" style={{ color: 'var(--ink)' }} onClick={() => setCmp([])}>Clear</button>
        </div>
      )}
      {open && (
        <div className="modal" onClick={() => setOpen(false)}><div role="dialog" aria-label="Compare units" onClick={(e) => e.stopPropagation()}>
          <div className="tw"><table>
            <thead><tr><th></th>{compared.map((p) => <th key={p._id}>{p.name}</th>)}</tr></thead>
            <tbody>
              {[['Brand', (p) => p.brand], ['Type', (p) => p.category],
                ['Capacity', (p) => `${(p.specs.capacityBTU || 0).toLocaleString()} BTU`],
                ['Inverter', (p) => (p.specs.isInverter ? 'Yes' : 'No')],
                ['Energy rating', (p) => p.specs.energyRating || '-'], ['Price', (p) => php(p.price)]]
                .map(([l, fn]) => <tr key={l}><th>{l}</th>{compared.map((p) => <td key={p._id}>{fn(p)}</td>)}</tr>)}
            </tbody></table></div>
          <p><button className="btn" onClick={() => setOpen(false)}>Close</button></p>
        </div></div>
      )}

      <footer><div className="wrap">
        <div><b>{store.storeName || 'Astron Showroom'}</b><br />{store.address}<br />{store.businessHours}</div>
        <div><b>After-sales</b><br />Warranty claims, repair, cleaning and maintenance<br />requests are available from your account.</div>
        <div><b>Contact</b><br />{store.email}<br />{store.phone}</div>
      </div></footer>
    </>
  );
}
