import { PortalFrame } from "../components/portal-frame";
import { VendorHub } from "../components/vendor-hub";

export default function VendorPage() {
  return (
    <PortalFrame
      title="Vendor Portal"
      subtitle="Fulfillment tracking, invoice 3-way matching, and payment status"
      role="vendor"
    >
      <VendorHub />
    </PortalFrame>
  );
}
