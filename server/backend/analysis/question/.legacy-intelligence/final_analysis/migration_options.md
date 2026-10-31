# Migration Options

Each option is suggested per module from the heat map. Benefits and risks must be confirmed by the target architecture review.

| Module | Strategy | Why | Main risk | Validation |
|---|---|---|---|---|
| client/components | Retain; modernize opportunistically | criticality 1, coupling 4, test safety 1, debt 5 | regression in undocumented behaviour (1 protected item(s)) | characterization tests green before and after |
| client | Retain; modernize opportunistically | criticality 1, coupling 4, test safety 1, debt 3 | regression in undocumented behaviour (1 protected item(s)) | characterization tests green before and after |
| server/app/api | Retain; modernize opportunistically | criticality 2, coupling 5, test safety 1, debt 1 | regression in undocumented behaviour (4 protected item(s)) | characterization tests green before and after |
| server/app/engine | Retain; modernize opportunistically | criticality 2, coupling 5, test safety 1, debt 1 | regression in undocumented behaviour (4 protected item(s)) | characterization tests green before and after |
| server/app/services | Retain; modernize opportunistically | criticality 2, coupling 5, test safety 1, debt 1 | regression in undocumented behaviour (4 protected item(s)) | characterization tests green before and after |
| server/app | Retain; modernize opportunistically | criticality 1, coupling 5, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
| server/app/core | Retain; modernize opportunistically | criticality 1, coupling 5, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
| server/app/models | Retain; modernize opportunistically | criticality 1, coupling 5, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
| client/services | Retain; modernize opportunistically | criticality 1, coupling 2, test safety 1, debt 1 | regression in undocumented behaviour (1 protected item(s)) | characterization tests green before and after |
| server | Retain; modernize opportunistically | criticality 1, coupling 1, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
| server/app/utils | Retain; modernize opportunistically | criticality 1, coupling 1, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
| server/data | Retain; modernize opportunistically | criticality 1, coupling 1, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
| server/utils | Retain; modernize opportunistically | criticality 1, coupling 1, test safety 1, debt 1 | regression in undocumented behaviour (0 protected item(s)) | characterization tests green before and after |
