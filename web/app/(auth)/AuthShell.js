import { Rings } from '@/components/Icons';

export default function AuthShell({ title, sub, children }) {
  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', padding: '56px 16px 0' }}>
      <div className="card stack gap-20" style={{ width: '100%', maxWidth: 480, padding: 'clamp(24px, 5vw, 40px)', borderRadius: 32 }}>
        <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Rings size={52} stroke={2} />
          <h1 className="display" style={{ fontSize: 34 }}>{title}</h1>
          {sub && <p className="muted">{sub}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
