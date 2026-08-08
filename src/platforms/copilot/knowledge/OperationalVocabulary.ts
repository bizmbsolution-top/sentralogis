export enum OperationalTerm {
  JOB_ORDER = 'JOB_ORDER',
  WORK_ORDER = 'WORK_ORDER',
  DRIVER = 'DRIVER',
  VEHICLE = 'VEHICLE',
  CONTAINER = 'CONTAINER',
  SEAL = 'SEAL',
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
  WAITING = 'WAITING',
  LOADING = 'LOADING',
  UNLOADING = 'UNLOADING',
  POD = 'POD',
  DAMAGE = 'DAMAGE',
  DELAY = 'DELAY',
  GATE_IN = 'GATE_IN',
  GATE_OUT = 'GATE_OUT',
  RETURN_EMPTY = 'RETURN_EMPTY',
  ORIGIN = 'ORIGIN',
  DESTINATION = 'DESTINATION',
  CUSTOMER = 'CUSTOMER'
}

export const OperationalVocabulary: Record<OperationalTerm, { label: string, description: string, synonyms: string[] }> = {
  [OperationalTerm.JOB_ORDER]: {
    label: 'Job Order',
    description: 'A distinct order assigned to a driver to perform a specific delivery or pickup task.',
    synonyms: ['JO', 'Job', 'Order', 'Tugas']
  },
  [OperationalTerm.WORK_ORDER]: {
    label: 'Work Order',
    description: 'A broader customer request that may encompass multiple Job Orders.',
    synonyms: ['WO', 'Customer Order']
  },
  [OperationalTerm.DRIVER]: {
    label: 'Driver',
    description: 'The operator of the vehicle assigned to a Job Order.',
    synonyms: ['Supir', 'Driver']
  },
  [OperationalTerm.VEHICLE]: {
    label: 'Vehicle',
    description: 'The physical truck or transport assigned to the job.',
    synonyms: ['Truck', 'Mobil', 'Kendaraan']
  },
  [OperationalTerm.CONTAINER]: {
    label: 'Container',
    description: 'The standard shipping unit.',
    synonyms: ['Box', 'Kontainer']
  },
  [OperationalTerm.SEAL]: {
    label: 'Seal',
    description: 'The security tag sealing a container or box truck.',
    synonyms: ['Segel']
  },
  [OperationalTerm.DELIVERY]: {
    label: 'Delivery',
    description: 'The act of transporting goods to the final destination.',
    synonyms: ['Kirim', 'Drop']
  },
  [OperationalTerm.PICKUP]: {
    label: 'Pickup',
    description: 'The act of retrieving goods from the origin.',
    synonyms: ['Ambil', 'Muat']
  },
  [OperationalTerm.ARRIVAL]: {
    label: 'Arrival',
    description: 'When the vehicle enters the destination geofence.',
    synonyms: ['Tiba', 'Sampai']
  },
  [OperationalTerm.DEPARTURE]: {
    label: 'Departure',
    description: 'When the vehicle exits the origin or destination geofence.',
    synonyms: ['Berangkat', 'Jalan']
  },
  [OperationalTerm.WAITING]: {
    label: 'Waiting',
    description: 'Idle time spent at a location before the next operational step.',
    synonyms: ['Tunggu', 'Antre']
  },
  [OperationalTerm.LOADING]: {
    label: 'Loading',
    description: 'The process of putting goods into the vehicle/container.',
    synonyms: ['Muat', 'Stuffing']
  },
  [OperationalTerm.UNLOADING]: {
    label: 'Unloading',
    description: 'The process of removing goods from the vehicle/container.',
    synonyms: ['Bongkar', 'Unstuffing']
  },
  [OperationalTerm.POD]: {
    label: 'Proof of Delivery',
    description: 'Documentary evidence that delivery was completed.',
    synonyms: ['Bukti', 'Surat Jalan']
  },
  [OperationalTerm.DAMAGE]: {
    label: 'Damage',
    description: 'Any reported harm to the goods, vehicle, or container.',
    synonyms: ['Rusak', 'Klaim']
  },
  [OperationalTerm.DELAY]: {
    label: 'Delay',
    description: 'An interruption causing the timeline to exceed estimates.',
    synonyms: ['Telat', 'Terlambat']
  },
  [OperationalTerm.GATE_IN]: {
    label: 'Gate In',
    description: 'Entering a port or major logistics hub.',
    synonyms: ['Masuk Pelabuhan']
  },
  [OperationalTerm.GATE_OUT]: {
    label: 'Gate Out',
    description: 'Exiting a port or major logistics hub.',
    synonyms: ['Keluar Pelabuhan']
  },
  [OperationalTerm.RETURN_EMPTY]: {
    label: 'Return Empty',
    description: 'Returning an empty container to the depo.',
    synonyms: ['Balik Kosong']
  },
  [OperationalTerm.ORIGIN]: {
    label: 'Origin',
    description: 'The starting point of the Job Order.',
    synonyms: ['Asal', 'Pabrik']
  },
  [OperationalTerm.DESTINATION]: {
    label: 'Destination',
    description: 'The ending point of the Job Order.',
    synonyms: ['Tujuan', 'Gudang']
  },
  [OperationalTerm.CUSTOMER]: {
    label: 'Customer',
    description: 'The owner of the Work Order.',
    synonyms: ['Klien', 'Pemilik Barang']
  }
};
