// components/hq/AddForwardingItemModal.tsx
// Modal component for adding forwarding items to HQ CreateWOForm

import React, { useState, useEffect } from 'react';
import { fetchLocations } from '@/lib/domain/forwarding/repository';
import { serviceTemplates } from '@/lib/domain/forwarding/serviceTemplates';
import { autoPopulatePricing } from '@/lib/domain/forwarding/pricing';

interface AddForwardingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocumentType: 'schedule' | 'customs';
  onAdd: (payload: any) => Promise<void>;
}

export const AddForwardingItemModal: React.FC<AddForwardingItemModalProps> = ({
  isOpen,
  onClose,
  currentDocumentType,
  onAdd,
}) => {
  const [formData, setFormData] = useState({
    legType: 'SEA_FREIGHT',
    startLocation: '',
    endLocation: '',
    scheduledStart: '',
    scheduledEnd: '',
    executionMode: 'OWN',
    containerType: 'FCL',
  });
  const [locations, setLocations] = useState<any[]>([]);
  const [modalReady, setModalReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calculatedPricing, setCalculatedPricing] = useState<{
    sellingPrice: number;
    costing: { originCost: number; destinationCost: number };
    profit: number;
  } | null>(null);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const fetchedLocations = await fetchLocations();
        setLocations(fetchedLocations);
        setModalReady(true);
      } catch (error) {
        console.error('Failed to load locations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, []);

  const calculatePricing = async () => {
    if (!formData.startLocation || !formData.endLocation) return;

    const startLoc = locations.find((l) => l.name === formData.startLocation);
    const endLoc = locations.find((l) => l.name === formData.endLocation);

    if (startLoc && endLoc) {
      try {
        const pricingData = await autoPopulatePricing(
          formData.containerType,
          startLoc.location_id,
          endLoc.location_id,
          formData.executionMode as 'OWN' | 'VENDOR'
        );
        setCalculatedPricing(pricingData);
      } catch (error) {
        console.error('Pricing calculation failed:', error);
      }
    }
  };

  const handleExecutionModeChange = (newMode: string) => {
    setFormData((prev) => ({ ...prev, executionMode: newMode }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.startLocation || !formData.endLocation) {
        alert('Please select valid start and end locations');
        return;
      }

      const payload = {
        ...formData,
        pricing: calculatedPricing,
      };

      await onAdd(payload);
      onClose();
    } catch (error) {
      console.error('Failed to add forwarding item:', error);
    }
  };

  if (!isOpen) return null;

  if (currentDocumentType === 'customs') {
    return (
      <div className="modal-overlaying" role="dialog" aria-modal="true">
        <div className="modal-reactivity">
          <div className="modal-reactivity__content">
            <div className="modal-reactivity__header">
              Customs Documentation
            </div>
            <div className="modal-reactivity__body">
              <p>
                Customs connection is not yet configured. Please wait for the
                integration to be completed before adding customs documents.
              </p>
            </div>
            <div className="modal-reactivity__footer">
              <button onClick={onClose} className="p-button p-button-text">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !modalReady) {
    return (
      <div className="modal-overlaying" role="dialog" aria-modal="true">
        <div className="modal-reactivity">
          <div className="modal-reactivity__content">
            <div className="modal-reactivity__body">Loading locations...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlaying" role="dialog" aria-modal="true">
      <div className="modal-reactivity">
        <div className="modal-reactivity__content">
          <div className="modal-reactivity__header">Add Forwarding Item</div>

          <div className="modal-reactivity__body">
            <div className="form-group">
              <label>Leg Type</label>
              <select
                value={formData.legType}
                onChange={(e) =>
                  setFormData({ ...formData, legType: e.target.value })
                }
              >
                <option value="SEA_FREIGHT">Sea Freight</option>
                <option value="LAND_FREIGHT">Land Freight</option>
                <option value="CONSOLIDATION">Consolidation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Start Location</label>
              <select
                value={formData.startLocation}
                onChange={(e) => {
                  setFormData({ ...formData, startLocation: e.target.value });
                  calculatePricing();
                }}
              >
                <option value="">Select Start Location</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>End Location</label>
              <select
                value={formData.endLocation}
                onChange={(e) => {
                  setFormData({ ...formData, endLocation: e.target.value });
                  calculatePricing();
                }}
              >
                <option value="">Select End Location</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Scheduled Start</label>
              <input
                type="datetime-local"
                value={formData.scheduledStart}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledStart: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Scheduled End</label>
              <input
                type="datetime-local"
                value={formData.scheduledEnd}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledEnd: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Container Type</label>
              <select
                value={formData.containerType}
                onChange={(e) =>
                  setFormData({ ...formData, containerType: e.target.value })
                }
              >
                <option value="FCL">FCL</option>
                <option value="LCL">LCL</option>
              </select>
            </div>

            <div className="form-group">
              <label>Execution Mode</label>
              <div className="execution-mode-toggle">
                {serviceTemplates.landFreight.executionModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleExecutionModeChange(mode)}
                    className={`execution-mode-btn ${
                      formData.executionMode === mode ? 'active' : ''
                    }`}
                  >
                    {mode === 'OWN' ? 'Own Fleet' : 'Vendor'}
                  </button>
                ))}
              </div>
            </div>

            {calculatedPricing && (
              <div className="pricing-summary">
                <h4>Pricing Summary</h4>
                <div>Selling Price: {calculatedPricing.sellingPrice}</div>
                <div>
                  Origin Cost: {calculatedPricing.costing.originCost}
                </div>
                <div>
                  Destination Cost:{' '}
                  {calculatedPricing.costing.destinationCost}
                </div>
                <div>Profit: {calculatedPricing.profit}</div>
              </div>
            )}
          </div>

          <div className="modal-reactivity__footer">
            <button onClick={onClose} className="p-button p-button-text">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="p-button p-button-primary"
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
