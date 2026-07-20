export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          subscription_status: string
          settings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          slug: string
          subscription_status?: string
          settings?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          subscription_status?: string
          settings?: any
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          department: string | null
          job_title: string | null
          phone: string | null
          avatar_url: string | null
          password_hash: string
          organization_id: string
          active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          department?: string | null
          job_title?: string | null
          phone?: string | null
          avatar_url?: string | null
          password_hash: string
          organization_id: string
          active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          department?: string | null
          job_title?: string | null
          phone?: string | null
          avatar_url?: string | null
          password_hash?: string
          organization_id?: string
          active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          profile_id: string
          role: string
          status: string
          invited_by_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          organization_id: string
          profile_id: string
          role?: string
          status?: string
          invited_by_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          profile_id?: string
          role?: string
          status?: string
          invited_by_id?: string | null
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          token: string
          profile_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id: string
          token: string
          profile_id: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          profile_id?: string
          expires_at?: string
          created_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          code: string
          label_fr: string
          label_en: string
          category: string
          parent_code: string | null
          is_active: boolean
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          code: string
          label_fr: string
          label_en: string
          category: string
          parent_code?: string | null
          is_active?: boolean
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          label_fr?: string
          label_en?: string
          category?: string
          parent_code?: string | null
          is_active?: boolean
          organization_id?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          document_number: string
          title: string
          doc_type: string
          version: string
          status: string
          classification: string
          code: string | null
          iso_clause: string | null
          document_level: number
          parent_document_id: string | null
          department_code: string | null
          is_prerequisite: boolean
          review_cycle_months: number
          validation_phase: string | null
          effective_date: string | null
          expiration_date: string | null
          last_reviewed: string | null
          next_review: string | null
          owner: string | null
          retention_period: string | null
          doc_scope: string | null
          doc_references: string | null
          content: string | null
          summary: string | null
          is_template: boolean
          template_reference_id: string | null
          template_reference_version: string | null
          type_specific_data: string | null
          custom_fields_json: any | null
          organization_id: string
          author_id: string | null
          created_by_id: string | null
          approver_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          document_number: string
          title: string
          doc_type: string
          version?: string
          status?: string
          classification?: string
          code?: string | null
          iso_clause?: string | null
          document_level?: number
          parent_document_id?: string | null
          department_code?: string | null
          is_prerequisite?: boolean
          review_cycle_months?: number
          validation_phase?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          last_reviewed?: string | null
          next_review?: string | null
          owner?: string | null
          retention_period?: string | null
          doc_scope?: string | null
          doc_references?: string | null
          content?: string | null
          summary?: string | null
          is_template?: boolean
          template_reference_id?: string | null
          template_reference_version?: string | null
          type_specific_data?: string | null
          custom_fields_json?: any | null
          organization_id: string
          author_id?: string | null
          created_by_id?: string | null
          approver_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_number?: string
          title?: string
          doc_type?: string
          version?: string
          status?: string
          classification?: string
          code?: string | null
          iso_clause?: string | null
          document_level?: number
          parent_document_id?: string | null
          department_code?: string | null
          is_prerequisite?: boolean
          review_cycle_months?: number
          validation_phase?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          last_reviewed?: string | null
          next_review?: string | null
          owner?: string | null
          retention_period?: string | null
          doc_scope?: string | null
          doc_references?: string | null
          content?: string | null
          summary?: string | null
          is_template?: boolean
          template_reference_id?: string | null
          template_reference_version?: string | null
          type_specific_data?: string | null
          custom_fields_json?: any | null
          organization_id?: string
          author_id?: string | null
          created_by_id?: string | null
          approver_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      electronic_signatures: {
        Row: {
          id: string
          document_id: string | null
          record_id: string | null
          record_type: string | null
          signed_by_id: string
          signer_name: string
          signer_role: string
          signature_type: string
          signature_hash: string
          user_agent: string | null
          revoked: boolean
          revocation_reason: string | null
          organization_id: string
          created_at: string
        }
        Insert: {
          id: string
          document_id?: string | null
          record_id?: string | null
          record_type?: string | null
          signed_by_id: string
          signer_name: string
          signer_role: string
          signature_type: string
          signature_hash: string
          user_agent?: string | null
          revoked?: boolean
          revocation_reason?: string | null
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string | null
          record_id?: string | null
          record_type?: string | null
          signed_by_id?: string
          signer_name?: string
          signer_role?: string
          signature_type?: string
          signature_hash?: string
          user_agent?: string | null
          revoked?: boolean
          revocation_reason?: string | null
          organization_id?: string
          created_at?: string
        }
      }
      document_prerequisites: {
        Row: {
          id: string
          organization_id: string
          record_type: string
          required_doc_type: string
          required_doc_ref: string | null
          is_mandatory: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id: string
          organization_id: string
          record_type: string
          required_doc_type: string
          required_doc_ref?: string | null
          is_mandatory?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          record_type?: string
          required_doc_type?: string
          required_doc_ref?: string | null
          is_mandatory?: boolean
          description?: string | null
          created_at?: string
        }
      }
      document_triggers: {
        Row: {
          id: string
          source_document_id: string
          target_document_id: string
          trigger_type: string
          description: string | null
          is_mandatory: boolean
          organization_id: string
          created_at: string
        }
        Insert: {
          id: string
          source_document_id: string
          target_document_id: string
          trigger_type: string
          description?: string | null
          is_mandatory?: boolean
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          source_document_id?: string
          target_document_id?: string
          trigger_type?: string
          description?: string | null
          is_mandatory?: boolean
          organization_id?: string
          created_at?: string
        }
      }
      document_relationships: {
        Row: {
          id: string
          parent_document_id: string
          child_document_id: string
          relationship_type: string
          organization_id: string
          created_at: string
        }
        Insert: {
          id: string
          parent_document_id: string
          child_document_id: string
          relationship_type: string
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          parent_document_id?: string
          child_document_id?: string
          relationship_type?: string
          organization_id?: string
          created_at?: string
        }
      }
      document_code_sequences: {
        Row: {
          id: string
          prefix: string
          department_suffix: string | null
          last_sequence: number
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          prefix: string
          department_suffix?: string | null
          last_sequence?: number
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prefix?: string
          department_suffix?: string | null
          last_sequence?: number
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      form_templates: {
        Row: {
          id: string
          document_id: string | null
          title: string
          version: string
          description: string | null
          fieldsJson: any
          is_active: boolean
          status: string
          module_type: string
          workflow_json: any | null
          compliance_json: any | null
          signaturesJson: any
          current_approval_step: number
          previous_version_id: string | null
          effective_date: string | null
          review_comment: string | null
          organization_id: string
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          document_id?: string | null
          title: string
          version?: string
          description?: string | null
          fieldsJson?: any
          is_active?: boolean
          status?: string
          module_type: string
          workflow_json?: any | null
          compliance_json?: any | null
          signaturesJson?: any
          current_approval_step?: number
          previous_version_id?: string | null
          effective_date?: string | null
          review_comment?: string | null
          organization_id: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string | null
          title?: string
          version?: string
          description?: string | null
          fieldsJson?: any
          is_active?: boolean
          status?: string
          module_type?: string
          workflow_json?: any | null
          compliance_json?: any | null
          signaturesJson?: any
          current_approval_step?: number
          previous_version_id?: string | null
          effective_date?: string | null
          review_comment?: string | null
          organization_id?: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      form_instances: {
        Row: {
          id: string
          template_id: string
          template_version: string | null
          reference_number: string | null
          values_json: any
          status: string
          is_locked: boolean
          submitted_by_id: string | null
          submitted_at: string | null
          signature_hash: string | null
          signaturesJson: any
          current_approval_step: number
          approvalHistoryJson: any
          parent_document_id: string | null
          linked_record_id: string | null
          linked_record_type: string | null
          record_type_slug: string | null
          organization_id: string
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          template_id: string
          template_version?: string | null
          reference_number?: string | null
          values_json?: any
          status?: string
          is_locked?: boolean
          submitted_by_id?: string | null
          submitted_at?: string | null
          signature_hash?: string | null
          signaturesJson?: any
          current_approval_step?: number
          approvalHistoryJson?: any
          parent_document_id?: string | null
          linked_record_id?: string | null
          linked_record_type?: string | null
          record_type_slug?: string | null
          organization_id: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          template_version?: string | null
          reference_number?: string | null
          values_json?: any
          status?: string
          is_locked?: boolean
          submitted_by_id?: string | null
          submitted_at?: string | null
          signature_hash?: string | null
          signaturesJson?: any
          current_approval_step?: number
          approvalHistoryJson?: any
          parent_document_id?: string | null
          linked_record_id?: string | null
          linked_record_type?: string | null
          record_type_slug?: string | null
          organization_id?: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      capas: {
        Row: {
          id: string
          capa_number: string
          title: string
          capa_type: string
          status: string
          priority: string
          source: string
          source_reference_id: string | null
          source_record_type: string | null
          description: string | null
          problem_statement: string | null
          investigation_details: string | null
          root_cause_analysis: string | null
          root_cause_category: string | null
          fiveWhysJson: any
          corrective_action: string | null
          effectiveness_verification_method: string | null
          effectiveness_criteria: string | null
          effectiveness_result: string | null
          linked_document_id: string | null
          linked_ncr_id: string | null
          linked_audit_id: string | null
          linked_capa_id: string | null
          template_id: string | null
          template_version: string | null
          assigned_to_id: string | null
          owner_id: string | null
          due_date: string | null
          created_date: string
          closed_date: string | null
          organization_id: string
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          capa_number: string
          title: string
          capa_type?: string
          status?: string
          priority?: string
          source?: string
          source_reference_id?: string | null
          source_record_type?: string | null
          description?: string | null
          problem_statement?: string | null
          investigation_details?: string | null
          root_cause_analysis?: string | null
          root_cause_category?: string | null
          fiveWhysJson?: any
          corrective_action?: string | null
          effectiveness_verification_method?: string | null
          effectiveness_criteria?: string | null
          effectiveness_result?: string | null
          linked_document_id?: string | null
          linked_ncr_id?: string | null
          linked_audit_id?: string | null
          linked_capa_id?: string | null
          template_id?: string | null
          template_version?: string | null
          assigned_to_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          created_date?: string
          closed_date?: string | null
          organization_id: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          capa_number?: string
          title?: string
          capa_type?: string
          status?: string
          priority?: string
          source?: string
          source_reference_id?: string | null
          source_record_type?: string | null
          description?: string | null
          problem_statement?: string | null
          investigation_details?: string | null
          root_cause_analysis?: string | null
          root_cause_category?: string | null
          fiveWhysJson?: any
          corrective_action?: string | null
          effectiveness_verification_method?: string | null
          effectiveness_criteria?: string | null
          effectiveness_result?: string | null
          linked_document_id?: string | null
          linked_ncr_id?: string | null
          linked_audit_id?: string | null
          linked_capa_id?: string | null
          template_id?: string | null
          template_version?: string | null
          assigned_to_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          created_date?: string
          closed_date?: string | null
          organization_id?: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      non_conformances: {
        Row: {
          id: string
          ncr_number: string
          title: string
          ncr_type: string
          status: string
          severity: string
          source: string | null
          description: string | null
          lot_number: string | null
          quantity_affected: string | null
          disposition: string
          is_oos_oot: boolean
          analytical_method: string | null
          measured_value: number | null
          measured_unit: string | null
          spec_limit: string | null
          phase1_conclusion: string | null
          phase2_required: boolean
          phase2_conclusion: string | null
          reject_lot: boolean
          linked_capa_id: string | null
          linked_procedure_ref: string | null
          supplier_id: string | null
          impact_assessment: string | null
          containment_actions: string | null
          affected_product: string | null
          closed_signature_hash: string | null
          closed_signed_at: string | null
          closed_by_id: string | null
          closed_reason: string | null
          assigned_to_id: string | null
          owner_id: string | null
          due_date: string | null
          created_date: string
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          ncr_number: string
          title: string
          ncr_type?: string
          status?: string
          severity?: string
          source?: string | null
          description?: string | null
          lot_number?: string | null
          quantity_affected?: string | null
          disposition?: string
          is_oos_oot?: boolean
          analytical_method?: string | null
          measured_value?: number | null
          measured_unit?: string | null
          spec_limit?: string | null
          phase1_conclusion?: string | null
          phase2_required?: boolean
          phase2_conclusion?: string | null
          reject_lot?: boolean
          linked_capa_id?: string | null
          linked_procedure_ref?: string | null
          supplier_id?: string | null
          impact_assessment?: string | null
          containment_actions?: string | null
          affected_product?: string | null
          closed_signature_hash?: string | null
          closed_signed_at?: string | null
          closed_by_id?: string | null
          closed_reason?: string | null
          assigned_to_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          created_date?: string
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ncr_number?: string
          title?: string
          ncr_type?: string
          status?: string
          severity?: string
          source?: string | null
          description?: string | null
          lot_number?: string | null
          quantity_affected?: string | null
          disposition?: string
          is_oos_oot?: boolean
          analytical_method?: string | null
          measured_value?: number | null
          measured_unit?: string | null
          spec_limit?: string | null
          phase1_conclusion?: string | null
          phase2_required?: boolean
          phase2_conclusion?: string | null
          reject_lot?: boolean
          linked_capa_id?: string | null
          linked_procedure_ref?: string | null
          supplier_id?: string | null
          impact_assessment?: string | null
          containment_actions?: string | null
          affected_product?: string | null
          closed_signature_hash?: string | null
          closed_signed_at?: string | null
          closed_by_id?: string | null
          closed_reason?: string | null
          assigned_to_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          created_date?: string
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      deviations: {
        Row: {
          id: string
          dev_number: string
          title: string
          deviation_type: string
          status: string
          severity: string
          category: string
          description: string | null
          deviation_details: string | null
          justification: string | null
          risk_assessment: string | null
          corrective_action: string | null
          preventive_action: string | null
          sop_reference: string | null
          expected_result: string | null
          actual_result: string | null
          product_stage: string | null
          quarantine: boolean
          impact_on_validated_state: string | null
          impact_on_regulatory_filing: string | null
          containment_action: string | null
          detected_date: string | null
          is_planned_deviation: boolean
          lot_number: string | null
          product_code: string | null
          quantity_affected: string | null
          linked_capa_id: string | null
          linked_document_id: string | null
          assigned_to_id: string | null
          owner_id: string | null
          due_date: string | null
          closed_date: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          dev_number: string
          title: string
          deviation_type?: string
          status?: string
          severity?: string
          category?: string
          description?: string | null
          deviation_details?: string | null
          justification?: string | null
          risk_assessment?: string | null
          corrective_action?: string | null
          preventive_action?: string | null
          sop_reference?: string | null
          expected_result?: string | null
          actual_result?: string | null
          product_stage?: string | null
          quarantine?: boolean
          impact_on_validated_state?: string | null
          impact_on_regulatory_filing?: string | null
          containment_action?: string | null
          detected_date?: string | null
          is_planned_deviation?: boolean
          lot_number?: string | null
          product_code?: string | null
          quantity_affected?: string | null
          linked_capa_id?: string | null
          linked_document_id?: string | null
          assigned_to_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          closed_date?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dev_number?: string
          title?: string
          deviation_type?: string
          status?: string
          severity?: string
          category?: string
          description?: string | null
          deviation_details?: string | null
          justification?: string | null
          risk_assessment?: string | null
          corrective_action?: string | null
          preventive_action?: string | null
          sop_reference?: string | null
          expected_result?: string | null
          actual_result?: string | null
          product_stage?: string | null
          quarantine?: boolean
          impact_on_validated_state?: string | null
          impact_on_regulatory_filing?: string | null
          containment_action?: string | null
          detected_date?: string | null
          is_planned_deviation?: boolean
          lot_number?: string | null
          product_code?: string | null
          quantity_affected?: string | null
          linked_capa_id?: string | null
          linked_document_id?: string | null
          assigned_to_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          closed_date?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      change_controls: {
        Row: {
          id: string
          cc_number: string
          title: string
          cc_type: string
          status: string
          priority: string
          category: string
          description: string | null
          justification: string | null
          proposed_change: string | null
          detailed_change_description: string | null
          business_compliance_justification: string | null
          risk_assessment: string | null
          impact_analysis: string | null
          affected_areas: string | null
          impact_on_validated_systems: boolean
          implementation_plan: string | null
          implementation_date: string | null
          estimated_cost_impact: string | null
          completion_date: string | null
          regulatory_trigger: string | null
          emergency_flag: boolean
          linked_document_id: string | null
          linked_capa_id: string | null
          additional_references: string | null
          assigned_to_id: string | null
          requested_by_id: string | null
          approved_by_id: string | null
          approver_id: string | null
          owner_id: string | null
          due_date: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          cc_number: string
          title: string
          cc_type?: string
          status?: string
          priority?: string
          category?: string
          description?: string | null
          justification?: string | null
          proposed_change?: string | null
          detailed_change_description?: string | null
          business_compliance_justification?: string | null
          risk_assessment?: string | null
          impact_analysis?: string | null
          affected_areas?: string | null
          impact_on_validated_systems?: boolean
          implementation_plan?: string | null
          implementation_date?: string | null
          estimated_cost_impact?: string | null
          completion_date?: string | null
          regulatory_trigger?: string | null
          emergency_flag?: boolean
          linked_document_id?: string | null
          linked_capa_id?: string | null
          additional_references?: string | null
          assigned_to_id?: string | null
          requested_by_id?: string | null
          approved_by_id?: string | null
          approver_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cc_number?: string
          title?: string
          cc_type?: string
          status?: string
          priority?: string
          category?: string
          description?: string | null
          justification?: string | null
          proposed_change?: string | null
          detailed_change_description?: string | null
          business_compliance_justification?: string | null
          risk_assessment?: string | null
          impact_analysis?: string | null
          affected_areas?: string | null
          impact_on_validated_systems?: boolean
          implementation_plan?: string | null
          implementation_date?: string | null
          estimated_cost_impact?: string | null
          completion_date?: string | null
          regulatory_trigger?: string | null
          emergency_flag?: boolean
          linked_document_id?: string | null
          linked_capa_id?: string | null
          additional_references?: string | null
          assigned_to_id?: string | null
          requested_by_id?: string | null
          approved_by_id?: string | null
          approver_id?: string | null
          owner_id?: string | null
          due_date?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      audits: {
        Row: {
          id: string
          audit_number: string
          title: string
          audit_type: string
          status: string
          audit_scope: string | null
          scheduled_date: string | null
          completed_date: string | null
          lead_auditor_id: string | null
          auditeesJson: any
          findingsJson: any
          audit_criteria: string | null
          compliance_rating: string | null
          completed_signature_hash: string | null
          completed_signed_at: string | null
          completed_signed_by_id: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          audit_number: string
          title: string
          audit_type?: string
          status?: string
          audit_scope?: string | null
          scheduled_date?: string | null
          completed_date?: string | null
          lead_auditor_id?: string | null
          auditeesJson?: any
          findingsJson?: any
          audit_criteria?: string | null
          compliance_rating?: string | null
          completed_signature_hash?: string | null
          completed_signed_at?: string | null
          completed_signed_by_id?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          audit_number?: string
          title?: string
          audit_type?: string
          status?: string
          audit_scope?: string | null
          scheduled_date?: string | null
          completed_date?: string | null
          lead_auditor_id?: string | null
          auditeesJson?: any
          findingsJson?: any
          audit_criteria?: string | null
          compliance_rating?: string | null
          completed_signature_hash?: string | null
          completed_signed_at?: string | null
          completed_signed_by_id?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      risks: {
        Row: {
          id: string
          risk_number: string
          title: string
          category: string
          status: string
          hazard_description: string | null
          risk_owner: string | null
          regulatory_reference: string | null
          control_type: string | null
          verification_method: string | null
          risk_acceptability: string
          priority_notes: string | null
          probability: number
          impact: number
          detectability: number
          rpn: number
          risk_level: string
          mitigation: string | null
          residual_risk: string | null
          residual_probability: number | null
          residual_impact: number | null
          residual_detectability: number | null
          residual_rpn: number | null
          linked_document_id: string | null
          linked_capa_id: string | null
          owner_id: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          risk_number: string
          title: string
          category?: string
          status?: string
          hazard_description?: string | null
          risk_owner?: string | null
          regulatory_reference?: string | null
          control_type?: string | null
          verification_method?: string | null
          risk_acceptability?: string
          priority_notes?: string | null
          probability?: number
          impact?: number
          detectability?: number
          rpn?: number
          risk_level?: string
          mitigation?: string | null
          residual_risk?: string | null
          residual_probability?: number | null
          residual_impact?: number | null
          residual_detectability?: number | null
          residual_rpn?: number | null
          linked_document_id?: string | null
          linked_capa_id?: string | null
          owner_id?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          risk_number?: string
          title?: string
          category?: string
          status?: string
          hazard_description?: string | null
          risk_owner?: string | null
          regulatory_reference?: string | null
          control_type?: string | null
          verification_method?: string | null
          risk_acceptability?: string
          priority_notes?: string | null
          probability?: number
          impact?: number
          detectability?: number
          rpn?: number
          risk_level?: string
          mitigation?: string | null
          residual_risk?: string | null
          residual_probability?: number | null
          residual_impact?: number | null
          residual_detectability?: number | null
          residual_rpn?: number | null
          linked_document_id?: string | null
          linked_capa_id?: string | null
          owner_id?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      training: {
        Row: {
          id: string
          title: string
          description: string | null
          training_type: string
          status: string
          assigned_to_id: string
          due_date: string | null
          completed_date: string | null
          document_id: string | null
          metadata_json: any | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          description?: string | null
          training_type?: string
          status?: string
          assigned_to_id: string
          due_date?: string | null
          completed_date?: string | null
          document_id?: string | null
          metadata_json?: any | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          training_type?: string
          status?: string
          assigned_to_id?: string
          due_date?: string | null
          completed_date?: string | null
          document_id?: string | null
          metadata_json?: any | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      batch_records: {
        Row: {
          id: string
          lot_number: string
          product_name: string
          product_code: string | null
          batch_size: string | null
          batch_size_unit: string
          master_formula_id: string | null
          sop_reference: string | null
          manufacturing_date: string | null
          expiry_date: string | null
          status: string
          is_locked: boolean
          qa_release_date: string | null
          qa_released_by_id: string | null
          stepsJson: any
          rawMaterialsJson: any
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          lot_number: string
          product_name: string
          product_code?: string | null
          batch_size?: string | null
          batch_size_unit?: string
          master_formula_id?: string | null
          sop_reference?: string | null
          manufacturing_date?: string | null
          expiry_date?: string | null
          status?: string
          is_locked?: boolean
          qa_release_date?: string | null
          qa_released_by_id?: string | null
          stepsJson?: any
          rawMaterialsJson?: any
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lot_number?: string
          product_name?: string
          product_code?: string | null
          batch_size?: string | null
          batch_size_unit?: string
          master_formula_id?: string | null
          sop_reference?: string | null
          manufacturing_date?: string | null
          expiry_date?: string | null
          status?: string
          is_locked?: boolean
          qa_release_date?: string | null
          qa_released_by_id?: string | null
          stepsJson?: any
          rawMaterialsJson?: any
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          supplier_code: string
          name: string
          category: string
          status: string
          qualification_date: string | null
          next_review_date: string | null
          certificationsJson: any
          performance_score: number | null
          qualification_doc_id: string | null
          qualification_method: string | null
          qualification_doc_ref: string | null
          website: string | null
          primary_contact_name: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          street: string | null
          city: string | null
          state_province: string | null
          postal_code: string | null
          country: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          notes: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          supplier_code: string
          name: string
          category?: string
          status?: string
          qualification_date?: string | null
          next_review_date?: string | null
          certificationsJson?: any
          performance_score?: number | null
          qualification_doc_id?: string | null
          qualification_method?: string | null
          qualification_doc_ref?: string | null
          website?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          street?: string | null
          city?: string | null
          state_province?: string | null
          postal_code?: string | null
          country?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_code?: string
          name?: string
          category?: string
          status?: string
          qualification_date?: string | null
          next_review_date?: string | null
          certificationsJson?: any
          performance_score?: number | null
          qualification_doc_id?: string | null
          qualification_method?: string | null
          qualification_doc_ref?: string | null
          website?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          street?: string | null
          city?: string | null
          state_province?: string | null
          postal_code?: string | null
          country?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      audit_trails: {
        Row: {
          id: string
          sequence_number: number | null
          previous_hash: string | null
          hash: string | null
          audit_action: string
          table_name: string
          record_id: string
          user_id: string | null
          user_email: string | null
          old_values_json: any | null
          new_values_json: any | null
          ip_address: string | null
          user_agent: string | null
          organization_id: string
          created_at: string
        }
        Insert: {
          id: string
          sequence_number?: number | null
          previous_hash?: string | null
          hash?: string | null
          audit_action: string
          table_name: string
          record_id: string
          user_id?: string | null
          user_email?: string | null
          old_values_json?: any | null
          new_values_json?: any | null
          ip_address?: string | null
          user_agent?: string | null
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          sequence_number?: number | null
          previous_hash?: string | null
          hash?: string | null
          audit_action?: string
          table_name?: string
          record_id?: string
          user_id?: string | null
          user_email?: string | null
          old_values_json?: any | null
          new_values_json?: any | null
          ip_address?: string | null
          user_agent?: string | null
          organization_id?: string
          created_at?: string
        }
      }
      record_type_definitions: {
        Row: {
          id: string
          slug: string
          name: string
          name_en: string | null
          icon: string
          description: string | null
          statusFlowJson: any
          defaultFieldsJson: any
          complianceRefsJson: any
          code_prefix: string | null
          is_system: boolean
          is_active: boolean
          requires_esig: boolean
          min_approver_count: number
          effective_date: string | null
          previous_version_id: string | null
          version: number
          change_reason: string | null
          organization_id: string
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          slug: string
          name: string
          name_en?: string | null
          icon?: string
          description?: string | null
          statusFlowJson?: any
          defaultFieldsJson?: any
          complianceRefsJson?: any
          code_prefix?: string | null
          is_system?: boolean
          is_active?: boolean
          requires_esig?: boolean
          min_approver_count?: number
          effective_date?: string | null
          previous_version_id?: string | null
          version?: number
          change_reason?: string | null
          organization_id: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          name_en?: string | null
          icon?: string
          description?: string | null
          statusFlowJson?: any
          defaultFieldsJson?: any
          complianceRefsJson?: any
          code_prefix?: string | null
          is_system?: boolean
          is_active?: boolean
          requires_esig?: boolean
          min_approver_count?: number
          effective_date?: string | null
          previous_version_id?: string | null
          version?: number
          change_reason?: string | null
          organization_id?: string
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      record_links: {
        Row: {
          id: string
          source_record_id: string
          source_record_type: string
          target_record_id: string
          target_record_type: string
          link_type: string
          description: string | null
          organization_id: string
          created_by_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          source_record_id: string
          source_record_type: string
          target_record_id: string
          target_record_type: string
          link_type?: string
          description?: string | null
          organization_id: string
          created_by_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source_record_id?: string
          source_record_type?: string
          target_record_id?: string
          target_record_type?: string
          link_type?: string
          description?: string | null
          organization_id?: string
          created_by_id?: string | null
          created_at?: string
        }
      }
      custom_field_definitions: {
        Row: {
          id: string
          name: string
          label: string
          type: string
          required: boolean
          optionsJson: any
          applicable_to: string
          organization_id: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id: string
          name: string
          label: string
          type?: string
          required?: boolean
          optionsJson?: any
          applicable_to?: string
          organization_id: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          label?: string
          type?: string
          required?: boolean
          optionsJson?: any
          applicable_to?: string
          organization_id?: string
          sort_order?: number
          created_at?: string
        }
      }
      scheduled_reports: {
        Row: {
          id: string
          name: string
          report_type: string
          format: string
          frequency: string
          recipientsJson: any
          filters_json: any
          status: string
          last_run_at: string | null
          next_run_at: string | null
          last_result: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          report_type: string
          format?: string
          frequency?: string
          recipientsJson?: any
          filters_json?: any
          status?: string
          last_run_at?: string | null
          next_run_at?: string | null
          last_result?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          report_type?: string
          format?: string
          frequency?: string
          recipientsJson?: any
          filters_json?: any
          status?: string
          last_run_at?: string | null
          next_run_at?: string | null
          last_result?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          title: string
          message: string
          type: string
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
          link: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          title: string
          message: string
          type?: string
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          link?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          title?: string
          message?: string
          type?: string
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          link?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      audit_config: {
        Row: {
          id: string
          signing_salt: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          signing_salt?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          signing_salt?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      v_org_dashboard: {
        Row: {
          organization_id: string
          organization_name: string
          total_documents: number
          approved_documents: number
          under_review_documents: number
          draft_documents: number
          obsolete_documents: number
          total_capas: number
          open_capas: number
          closed_capas: number
          overdue_capas: number
          total_ncrs: number
          open_ncrs: number
          closed_ncrs: number
          total_deviations: number
          open_deviations: number
          total_change_controls: number
          open_change_controls: number
          total_audits: number
          completed_audits: number
          planned_audits: number
          total_training: number
          completed_training: number
          overdue_training: number
          total_risks: number
          open_risks: number
          total_batch_records: number
          released_batch_records: number
          total_suppliers: number
          qualified_suppliers: number
          total_form_templates: number
          approved_form_templates: number
          unread_notifications: number
        }
        Insert: never
        Update: never
      }
      // Document hierarchy recursive view (multi-tenant)
      document_hierarchy: {
        Row: {
          id: string
          organization_id: string
          document_number: string | null
          title: string
          doc_type: string | null
          status: string
          level: number | null
          parent_document_id: string | null
          department_code: string | null
          iso_clause: string | null
          depth: number
          path_ids: string[]
          path_numbers: (string | null)[]
        }
        Insert: never
        Update: never
      }
    }
    Functions: {
      [key: string]: never
    }
    Enums: {
      [key: string]: never
    }
  }
}