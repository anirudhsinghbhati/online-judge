import { Link } from 'react-router-dom';
import AdminShell from '../components/AdminShell';

const dashboardCards = [
  {
    title: 'User Management',
    to: '/admin/user-management',
    description: 'Handle users, roles, access, and account review tasks from one place.',
    accent: 'from-cyan-400/30 to-sky-500/10'
  },
  {
    title: 'Problem Management',
    to: '/admin/problem-management',
    description: 'Create, review, and organize coding problems for the platform.',
    accent: 'from-emerald-400/30 to-teal-500/10'
  },
  {
    title: 'Contest Management',
    to: '/admin/contest-management',
    description: 'Plan contests, manage schedules, and keep event operations visible.',
    accent: 'from-amber-400/30 to-orange-500/10'
  },
  {
    title: 'Logs',
    to: '/admin/logs',
    description: 'Review audit trails, system events, and important operational activity.',
    accent: 'from-rose-400/30 to-red-500/10'
  },
  {
    title: 'Notice Board',
    to: '/admin/notices',
    description: 'Post notices, alerts, and platform notifications for contestants.',
    accent: 'from-fuchsia-400/30 to-purple-500/10'
  }
];


function Admin() {
  return (
    <AdminShell breadcrumb={[{ label: 'Admin Dashboard', to: '/admin' }]}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {dashboardCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="group rounded-[24px] border border-white/10 bg-slate-950/55 p-5 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.06]"
          >
            <div className={`h-1.5 rounded-full bg-gradient-to-r ${card.accent}`} />
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300 transition group-hover:border-white/20">
                Open
              </span>
            </div>
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}

export default Admin;