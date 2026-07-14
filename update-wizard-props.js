const fs = require('fs');

const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx';
let content = fs.readFileSync(path, 'utf-8');

const oldProps = `interface Props {
  tenantId: string;
  customers: { id: string; name: string; code: string }[];
  warehouses: { id: string; name: string; code: string }[];
  services?: any[];
  uoms?: { id: string; name: string }[];
}`;

const newProps = `interface Props {
  tenantId: string;
  customers: { id: string; name: string; code: string }[];
  warehouses: { id: string; name: string; code: string }[];
  services?: any[];
  uoms?: { id: string; name: string }[];
  initialData?: any;
}`;

content = content.replace(oldProps, newProps);

const oldComponentDef = `export default function ContractWizard({ tenantId, customers, warehouses, services = [], uoms = [] }: Props) {`;
const newComponentDef = `export default function ContractWizard({ tenantId, customers, warehouses, services = [], uoms = [], initialData }: Props) {`;

content = content.replace(oldComponentDef, newComponentDef);

const oldState = `  // Form State
  const [sbu, setSbu] = useState('WAREHOUSE');
  const [customerId, setCustomerId] = useState('');
  
  // Date & Config State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [billingMethod, setBillingMethod] = useState('MONTHLY_FIXED');

  // Multi-Warehouse State
  const [selectedWarehouses, setSelectedWarehouses] = useState<{
    id: string;
    warehouse_id: string;
    committed_space: string;
    uom_space: string;
  }[]>([]);

  // Dynamic Rates State
  const [rates, setRates] = useState<{ id: string; charge_code: string; label: string; rate_value: string; uom: string; category: string; warehouse_id: string | null }[]>([]);`;

const newState = `  // Form State
  const [sbu, setSbu] = useState('WAREHOUSE');
  const [customerId, setCustomerId] = useState(initialData?.customer_id || '');
  
  // Date & Config State
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [contractNumber, setContractNumber] = useState(initialData?.contract_number || '');
  const [billingMethod, setBillingMethod] = useState(initialData?.billing_method || 'MONTHLY_FIXED');

  // Multi-Warehouse State
  const [selectedWarehouses, setSelectedWarehouses] = useState<{
    id: string;
    warehouse_id: string;
    committed_space: string;
    uom_space: string;
  }[]>(initialData?.md_contract_warehouses?.map((w: any) => ({
    id: w.id,
    warehouse_id: w.warehouse_id,
    committed_space: w.committed_space?.toString() || '',
    uom_space: w.uom_space || 'PALLET'
  })) || []);

  // Dynamic Rates State
  const [rates, setRates] = useState<{ id: string; charge_code: string; label: string; rate_value: string; uom: string; category: string; warehouse_id: string | null }[]>(
    initialData?.md_billing_rates?.map((r: any) => ({
      id: r.id,
      charge_code: r.charge_code,
      label: services?.find(s => s.charge_code === r.charge_code)?.service_name || r.charge_code,
      category: services?.find(s => s.charge_code === r.charge_code)?.category || 'GENERAL',
      rate_value: r.rate_value?.toString() || '',
      uom: r.uom,
      warehouse_id: r.warehouse_id || null
    })) || []
  );`;

content = content.replace(oldState, newState);

const oldContractIdState = `  const [contractId, setContractId] = useState<string | null>(null);`;
const newContractIdState = `  const [contractId, setContractId] = useState<string | null>(initialData?.id || null);`;
content = content.replace(oldContractIdState, newContractIdState);

fs.writeFileSync(path, content);
console.log('ContractWizard updated successfully');
