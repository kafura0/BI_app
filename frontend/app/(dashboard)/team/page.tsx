"use client";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, RefreshCw, Mail, Clock } from "lucide-react";
import { teamApi, getErrorMessage, type TeamMember, type PendingInvite } from "@/lib/api";
import { formatDate } from "@/lib/utils";

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
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
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
    try { await teamApi.invite(inviteEmail, inviteRole); setInviteEmail(""); setShowInvite(false); await load(); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setInviting(false); }
  };

  const handleRevokeInvite = async (id: string) => {
    try { await teamApi.revokeInvite(id); setInvites((prev) => prev.filter((i) => i.id !== id)); }
    catch (e) { setError(getErrorMessage(e)); }
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
    <div className="max-w-4xl mx-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-lg font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>Team</h2>
          <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95"
          style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {error && <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>}

      {/* Invite card */}
      {showInvite && (
        <div className="glass-card rounded-xl p-lg">
          <h3 className="font-title-md mb-4" style={{ color: "var(--on-surface)" }}>Invite a team member</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }} />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleInvite} disabled={!inviteEmail || inviting}
                className="px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 text-sm"
                style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
                {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} Send
              </button>
              <button onClick={() => setShowInvite(false)}
                className="px-5 py-2.5 rounded-xl transition-colors text-sm"
                style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                Cancel
              </button>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--on-surface-variant)" }}>An email invitation will be sent to the address above.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : (
        <>
          {/* Members */}
          {members.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-lg py-4" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-title-md text-sm" style={{ color: "var(--on-surface)" }}>Members</p>
              </div>
              {members.map((member, i) => (
                <div key={member.user_id} className="flex items-center gap-4 px-lg py-4" style={i < members.length - 1 ? { borderBottom: "1px solid var(--outline-variant)" } : {}}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
                    <span className="text-sm font-medium uppercase">{member.full_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--on-surface)" }}>{member.full_name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={member.role} onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)", border: "1px solid var(--outline-variant)" }}>
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button onClick={() => handleRemoveMember(member.user_id)} title="Remove" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--on-surface-variant)" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {members.length === 0 && !loading && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--on-surface-variant)" }}>group</span>
              <p className="font-title-md mt-4" style={{ color: "var(--on-surface)" }}>No team members yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>Invite your colleagues to collaborate.</p>
            </div>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-lg py-4" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                <p className="font-title-md text-sm" style={{ color: "var(--on-surface)" }}>Pending Invitations</p>
              </div>
              {invites.map((invite, i) => (
                <div key={invite.id} className="flex items-center gap-4 px-lg py-4" style={i < invites.length - 1 ? { borderBottom: "1px solid var(--outline-variant)" } : {}}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-container-high)" }}>
                    <Mail className="w-4 h-4" style={{ color: "var(--on-surface-variant)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--on-surface)" }}>{invite.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" style={{ color: "var(--on-surface-variant)" }} />
                      <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Invited {formatDate(invite.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-full capitalize" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                    {invite.role}
                  </span>
                  <button onClick={() => handleRevokeInvite(invite.id)} title="Revoke" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--on-surface-variant)" }}>
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
