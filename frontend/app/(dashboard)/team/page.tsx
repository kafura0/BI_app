"use client";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, RefreshCw, Mail, Clock } from "lucide-react";
import { teamApi, getErrorMessage, type TeamMember, type PendingInvite } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "var(--secondary-container)" },
  analyst: { label: "Analyst", color: "var(--primary-container)" },
  viewer: { label: "Viewer", color: "var(--surface-variant)" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([teamApi.listMembers(), teamApi.listInvites()]);
      setMembers(membersRes.data);
      setInvites(invitesRes.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { let cancelled = false; (async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([teamApi.listMembers(), teamApi.listInvites()]);
      if (cancelled) return;
      setMembers(membersRes.data);
      setInvites(invitesRes.data);
    } catch (e) { if (!cancelled) setError(getErrorMessage(e)); }
    finally { if (!cancelled) setLoading(false); }
  })(); return () => { cancelled = true; }; }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await teamApi.invite(inviteEmail, inviteRole);
      setInviteEmail("");
      setShowInvite(false);
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setInviting(false); }
  };

  const handleRevokeInvite = async (id: string) => {
    try { await teamApi.revokeInvite(id); setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { setError(getErrorMessage(e)); }
  };
  const handleUpdateRole = async (userId: string, role: string) => {
    try { await teamApi.updateMemberRole(userId, role); setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role } : m)); }
    catch (e) { setError(getErrorMessage(e)); }
  };
  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    try { await teamApi.removeMember(userId); setMembers((prev) => prev.filter((m) => m.user_id !== userId)); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  return (
    <div className="max-w-4xl space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg font-bold" style={{ color: "var(--on-surface)" }}>Team</h1>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95"
          style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {error && <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>}

      {showInvite && (
        <div className="p-lg rounded-xl" style={{ backgroundColor: "var(--surface-container-low)", border: "1px solid var(--outline-variant)" }}>
          <h3 className="font-title-md mb-4" style={{ color: "var(--on-surface)" }}>Invite a team member</h3>
          <div className="flex gap-3 flex-wrap">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com"
              className="flex-1 min-w-48 px-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={handleInvite} disabled={!inviteEmail || inviting}
              className="px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
              style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
              {inviting ? <RefreshCw className="w-4 h-4 animate-spin"/> : null} Send Invite
            </button>
            <button onClick={() => setShowInvite(false)}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
              Cancel
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--on-surface-variant)" }}>An email invitation will be sent to the address above.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : (
        <>
          {members.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--outline-variant)" }}>
              <div className="px-5 py-3" style={{ backgroundColor: "var(--surface-container-high)", borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-medium text-sm" style={{ color: "var(--on-surface)" }}>Members</p>
              </div>
              {members.map((member, i) => {
                const roleConf = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.viewer;
                return (
                  <div key={member.user_id} className="flex items-center gap-4 px-5 py-4" style={i < members.length - 1 ? { borderBottom: "1px solid var(--outline-variant)" } : {}}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-variant)" }}>
                      <span className="text-sm font-medium uppercase" style={{ color: "var(--on-surface-variant)" }}>{member.full_name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--on-surface)" }}>{member.full_name}</p>
                      <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select value={member.role} onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                        className="text-xs font-medium px-2 py-1 rounded-full border-0"
                        style={{ backgroundColor: roleConf.color, color: "var(--on-secondary-container)" }}>
                        <option value="admin">Admin</option>
                        <option value="analyst">Analyst</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button onClick={() => handleRemoveMember(member.user_id)} title="Remove member" className="transition-colors p-1" style={{ color: "var(--on-surface-variant)" }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {members.length === 0 && (
            <div className="text-center py-16" style={{ color: "var(--on-surface-variant)" }}>No team members found.</div>
          )}
          {invites.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--outline-variant)" }}>
              <div className="px-5 py-3" style={{ backgroundColor: "var(--surface-container-high)", borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-medium text-sm" style={{ color: "var(--on-surface)" }}>Pending Invitations</p>
              </div>
              {invites.map((invite, i) => (
                <div key={invite.id} className="flex items-center gap-4 px-5 py-4" style={i < invites.length - 1 ? { borderBottom: "1px solid var(--outline-variant)" } : {}}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-container-high)" }}>
                    <Mail className="w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--on-surface)" }}>{invite.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" style={{ color: "var(--on-surface-variant)" }} />
                      <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Invited {formatDate(invite.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: `${ROLE_CONFIG[invite.role].color}`, color: "var(--on-secondary-container)" }}>
                    {invite.role}
                  </span>
                  <button onClick={() => handleRevokeInvite(invite.id)} title="Revoke invite" className="transition-colors p-1" style={{ color: "var(--on-surface-variant)" }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
