type InviteLinkProps = {
    code: string;
  };
  
  export function InviteLink({ code }: InviteLinkProps) {
    return (
      <div>
        <h3>Ссылка-приглашение:</h3>
        <input 
          type="text" 
          readOnly 
          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${code}`}
          style={{ width: '100%' }}
        />
      </div>
    );
  }