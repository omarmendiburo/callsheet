import { requireUser } from "@/lib/auth";
import { AdminShell } from "../_shell";
import { listTalentForCert } from "../_data";
import { grantCertification, revokeCertification } from "../_actions";

/*
 * Talent certification (spec §6). Grant writes a certifications row
 * (grantedBy = the acting admin) and flips certStatus to "certified"; revoke
 * sets it back to "none". Real criteria are owed from HMNTY — this is a
 * placeholder process, stated plainly on the page.
 */

export const dynamic = "force-dynamic";

export default async function AdminCertification() {
  await requireUser("admin");
  const talent = await listTalentForCert();
  const certified = talent.filter((t) => t.certStatus === "certified").length;

  return (
    <AdminShell active="/admin/certification">
      <h1 className="headline mt-10 text-4xl">Certification.</h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed">
        Certifying a creative flips their status to certified and records who
        granted it.
      </p>
      <p className="fact-secondary mt-3">
        criteria owed from HMNTY — placeholder process
      </p>
      <p className="fact-secondary mt-3">
        {certified} of {talent.length} certified
      </p>

      <div className="mt-6 overflow-x-auto border-t border-b border-rule">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="fact-secondary py-3 pr-4 font-normal">talent</th>
              <th className="fact-secondary py-3 pr-4 font-normal">city</th>
              <th className="fact-secondary py-3 pr-4 font-normal">account</th>
              <th className="fact-secondary py-3 pr-4 font-normal">cert status</th>
              <th className="fact-secondary py-3 font-normal">action</th>
            </tr>
          </thead>
          <tbody>
            {talent.map((t) => {
              const isCertified = t.certStatus === "certified";
              return (
                <tr key={t.talentId} className="border-b border-rule align-top">
                  <td className="py-3 pr-4 text-[14px]">{t.displayName}</td>
                  <td className="fact py-3 pr-4">{t.city}</td>
                  <td className="fact py-3 pr-4">
                    {t.userSuspended ? "suspended" : "active"}
                  </td>
                  <td className="fact py-3 pr-4">{t.certStatus}</td>
                  <td className="py-3">
                    <form
                      action={
                        isCertified ? revokeCertification : grantCertification
                      }
                    >
                      <input type="hidden" name="talentId" value={t.talentId} />
                      <button
                        type="submit"
                        className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                      >
                        {isCertified ? "revoke" : "grant"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {talent.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-[14px] text-secondary">
                  No talent profiles yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
