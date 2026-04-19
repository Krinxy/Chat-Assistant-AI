import type { CompanyWorkspaceText } from "./companyWorkspace.text";
import type { CompanyRecord, CompanyTeamMemberEntry } from "./companyWorkspace.types";

interface CompanyTeamTabProps {
  text: CompanyWorkspaceText;
  selectedCompany: CompanyRecord;
  activeTeamMembers: CompanyTeamMemberEntry[];
  editingTeamMemberId: string;
  teamEditFunction: string;
  teamEditName: string;
  onTeamEditFunctionChange: (value: string) => void;
  onTeamEditNameChange: (value: string) => void;
  onStartTeamEdit: (member: CompanyTeamMemberEntry) => void;
  onSaveTeamEdit: () => void;
  onCancelTeamEdit: () => void;
}

export function CompanyTeamTab({
  text,
  selectedCompany,
  activeTeamMembers,
  editingTeamMemberId,
  teamEditFunction,
  teamEditName,
  onTeamEditFunctionChange,
  onTeamEditNameChange,
  onStartTeamEdit,
  onSaveTeamEdit,
  onCancelTeamEdit,
}: CompanyTeamTabProps) {
  return (
    <div className="company-team-panel">
      <p className="company-team-title">{text.personaTitle}</p>
      <div className="company-persona-row">
        {selectedCompany.personas.map((persona) => (
          <span key={persona} className="company-pill">{persona}</span>
        ))}
      </div>

      <div className="company-team-table-wrap">
        <table className="company-team-table">
          <thead>
            <tr>
              <th>{text.teamFunctionCol}</th>
              <th>{text.teamNameCol}</th>
              <th>{text.teamLatestEventCol}</th>
              <th>{text.teamEditCol}</th>
            </tr>
          </thead>
          <tbody>
            {activeTeamMembers.map((member, index) => {
              const latestEvent =
                selectedCompany.recentEvents[index % Math.max(1, selectedCompany.recentEvents.length)] ?? "-";
              const isEditing = editingTeamMemberId === member.id;

              return (
                <tr key={member.id}>
                  <td>
                    {isEditing ? (
                      <input
                        value={teamEditFunction}
                        onChange={(event) => onTeamEditFunctionChange(event.target.value)}
                      />
                    ) : (
                      member.functionName
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={teamEditName}
                        onChange={(event) => onTeamEditNameChange(event.target.value)}
                      />
                    ) : (
                      member.fullName
                    )}
                  </td>
                  <td>{latestEvent}</td>
                  <td>
                    {isEditing ? (
                      <div className="company-team-row-actions">
                        <button type="button" onClick={onSaveTeamEdit}>{text.teamSave}</button>
                        <button type="button" onClick={onCancelTeamEdit}>{text.teamCancel}</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => onStartTeamEdit(member)}>
                        {text.teamEditCol}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {activeTeamMembers.length === 0 ? <p className="company-notes-empty">{text.teamNoMembers}</p> : null}
      </div>
    </div>
  );
}
