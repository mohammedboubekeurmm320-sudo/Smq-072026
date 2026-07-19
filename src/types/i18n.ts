// ============================================================================
// i18n Type Definitions — Complete translation key schema for QMS
// ============================================================================

export interface Translations {
  // ─── Navigation & Layout ────────────────────────────────────────────────
  nav: {
    dashboard: string;
    documents: string;
    documentHierarchy: string;
    ncr: string;
    capa: string;
    deviations: string;
    changeControl: string;
    audits: string;
    risks: string;
    training: string;
    batchRecords: string;
    suppliers: string;
    oosOot: string;
    forms: string;
    compliance: string;
    reports: string;
    settings: string;
    auditTrail: string;
    notifications: string;
    deadlines: string;
    admin: string;
    logout: string;
    userManagement: string;
    records: string;
    governance: string;
    recordTypes: string;
    customRecords: string;
    scheduledReports: string;
  };

  navGroups: {
    dashboard: string;
    governance: string;
    quality: string;
    production: string;
    administration: string;
  };

  // ─── Common Actions ────────────────────────────────────────────────────
  actions: {
    create: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    close: string;
    approve: string;
    reject: string;
    submit: string;
    export: string;
    import: string;
    search: string;
    filter: string;
    refresh: string;
    selectAll: string;
    deselectAll: string;
    bulkAction: string;
    print: string;
    download: string;
    upload: string;
    archive: string;
    restore: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
  };

  // ─── Common Labels ─────────────────────────────────────────────────────
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    close: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    loading: string;
    noData: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    yes: string;
    no: string;
    status: string;
    actions: string;
    details: string;
    date: string;
    description: string;
    title: string;
    type: string;
    priority: string;
    assignedTo: string;
    dueDate: string;
    createdAt: string;
    updatedAt: string;
    version: string;
    owner: string;
    department: string;
    total: string;
    allTypes: string;
    allStatuses: string;
    viewDetails: string;
    advanceTo: string;
    noResults: string;
    submit: string;
    scope: string;
    none: string;
    addLink: string;
    linkedRecords: string;
    auditTrail: string;
    signature: string;
    sign: string;
    approve: string;
    reject: string;
  };

  // ─── Status Labels ─────────────────────────────────────────────────────
  statuses: {
    // Document statuses
    draft: string;
    underReview: string;
    approved: string;
    effective: string;
    obsolete: string;
    withdrawn: string;
    // CAPA statuses
    open: string;
    investigation: string;
    implementation: string;
    effectivenessCheck: string;
    closed: string;
    // NCR statuses
    underInvestigation: string;
    pendingDisposition: string;
    // Deviation statuses
    pendingQaReview: string;
    // Change Control statuses
    requested: string;
    inImplementation: string;
    completed: string;
    rejected: string;
    // Audit statuses
    planned: string;
    inProgress: string;
    // Risk statuses
    mitigated: string;
    accepted: string;
    // Training statuses
    overdue: string;
    // Supplier statuses
    underEvaluation: string;
    conditional: string;
    qualified: string;
    disqualified: string;
    // Batch statuses
    pendingQaRelease: string;
    released: string;
    quarantine: string;
    // Form statuses
    submitted: string;
    // Generic
    active: string;
    inactive: string;
    archived: string;
    pending: string;
    locked: string;
  };

  // ─── All QMS Modules ───────────────────────────────────────────────────
  modules: {
    documents: {
      title: string;
      singular: string;
      newDocument: string;
      searchDocuments: string;
      documentNumber: string;
      documentTitle: string;
      documentType: string;
      documentLevel: string;
      classification: string;
      owner: string;
      reviewer: string;
      approver: string;
      effectiveDate: string;
      reviewDate: string;
      expiryDate: string;
      revision: string;
      file: string;
      supersedes: string;
      references: string;
      approvalWorkflow: string;
      documentControl: string;
      externalDocuments: string;
      regulatoryDocuments: string;
      confidentialDocuments: string;
    };

    capa: {
      title: string;
      singular: string;
      newCapa: string;
      searchCapas: string;
      capaNumber: string;
      description: string;
      type: {
        label: string;
        corrective: string;
        preventive: string;
      };
      priority: {
        label: string;
        critical: string;
        high: string;
        medium: string;
        low: string;
      };
      source: {
        label: string;
        nonConformance: string;
        auditFinding: string;
        customerComplaint: string;
        managementReview: string;
        processMonitoring: string;
        supplierIssue: string;
      };
      rootCause: {
        label: string;
        category: string;
        man: string;
        machine: string;
        method: string;
        material: string;
        measurement: string;
        environment: string;
        management: string;
        analysis: string;
        description: string;
      };
      effectiveness: {
        label: string;
        effective: string;
        notEffective: string;
        pendingReview: string;
        dueDate: string;
        result: string;
        verificationMethod: string;
      };
      dueDate: string;
      assignedTo: string;
      actions: string;
      investigation: string;
      completionDate: string;
    };

    ncr: {
      title: string;
      singular: string;
      newNcr: string;
      ncrNumber: string;
      description: string;
      type: {
        label: string;
        product: string;
        process: string;
        system: string;
        supplier: string;
        oos: string;
        oot: string;
      };
      severity: {
        label: string;
        critical: string;
        major: string;
        minor: string;
      };
      disposition: {
        label: string;
        useAsIs: string;
        rework: string;
        scrap: string;
        returnToSupplier: string;
        concession: string;
        pending: string;
      };
      source: string;
      productAffected: string;
      lotNumber: string;
      quantityAffected: string;
      immediateAction: string;
      investigation: string;
      rootCause: string;
      correctiveAction: string;
      linkedCapa: string;
      closureDate: string;
    };

    deviation: {
      title: string;
      singular: string;
      newDeviation: string;
      deviationNumber: string;
      description: string;
      type: {
        label: string;
        planned: string;
        unplanned: string;
      };
      category: {
        label: string;
        process: string;
        equipment: string;
        material: string;
        environment: string;
        personnel: string;
        documentation: string;
      };
      productStage: {
        label: string;
        rawMaterial: string;
        inProcess: string;
        finishedProduct: string;
        stability: string;
        other: string;
      };
      impactAssessment: string;
      justification: string;
      correctiveAction: string;
      preventiveAction: string;
      linkedCapa: string;
      approval: string;
      closureDate: string;
    };

    changeControl: {
      title: string;
      singular: string;
      newCc: string;
      ccNumber: string;
      description: string;
      type: {
        label: string;
        planned: string;
        unplanned: string;
        emergency: string;
      };
      category: {
        label: string;
        process: string;
        equipment: string;
        facility: string;
        document: string;
        material: string;
        computerSystem: string;
        organizational: string;
        manufacturing: string;
        regulatory: string;
        supplyChain: string;
        warehouse: string;
        other: string;
      };
      justification: string;
      riskAssessment: string;
      impactAssessment: string;
      implementationPlan: string;
      trainingRequired: string;
      verification: string;
      approval: string;
      effectiveDate: string;
      linkedDocuments: string;
    };

    audit: {
      title: string;
      singular: string;
      newAudit: string;
      auditNumber: string;
      auditPlan: string;
      type: {
        label: string;
        internal: string;
        external: string;
        supplier: string;
      };
      finding: {
        label: string;
        critical: string;
        major: string;
        minor: string;
        observation: string;
      };
      auditor: string;
      auditee: string;
      scope: string;
      criteria: string;
      scheduledDate: string;
      completedDate: string;
      findings: string;
      referenceClause: string;
      correctiveActionRequired: string;
      linkedCapa: string;
      report: string;
      closureDate: string;
    };

    risk: {
      title: string;
      singular: string;
      newRisk: string;
      riskNumber: string;
      description: string;
      hazard: string;
      category: {
        label: string;
        product: string;
        process: string;
        system: string;
        supplier: string;
      };
      controlType: {
        label: string;
        inherentSafeDesign: string;
        protectiveMeasures: string;
        informationForSafety: string;
      };
      acceptability: {
        label: string;
        acceptable: string;
        alarp: string;
        unacceptable: string;
      };
      fmea: {
        title: string;
        severity: string;
        occurrence: string;
        detection: string;
        rpn: string;
        riskLevel: string;
        existingControls: string;
        recommendedActions: string;
        residualRisk: string;
        riskMatrix: string;
      };
      mitigationPlan: string;
      residualRisk: string;
      riskOwner: string;
      reviewDate: string;
      status: string;
    };

    training: {
      title: string;
      singular: string;
      newTraining: string;
      trainingNumber: string;
      description: string;
      type: {
        label: string;
        onboarding: string;
        sop: string;
        regulatory: string;
        skill: string;
        certification: string;
      };
      deliveryMethod: {
        label: string;
        classroom: string;
        online: string;
        onTheJob: string;
        webinar: string;
        blended: string;
      };
      category: {
        label: string;
        gmp: string;
        glp: string;
        gcp: string;
        safety: string;
        quality: string;
        other: string;
      };
      trainer: string;
      trainees: string;
      scheduledDate: string;
      completionDate: string;
      dueDate: string;
      status: string;
      competency: string;
      retraining: string;
      retrainingFrequency: string;
      linkedSop: string;
      certificate: string;
      passRate: string;
    };

    batchRecord: {
      title: string;
      singular: string;
      newBatch: string;
      batchNumber: string;
      productName: string;
      batchStatus: string;
      batchSize: string;
      sizeUnit: string;
      startDate: string;
      completionDate: string;
      releaseDate: string;
      releasedBy: string;
      stepType: {
        label: string;
        weighing: string;
        mixing: string;
        filtration: string;
        filling: string;
        inspection: string;
        labeling: string;
        packaging: string;
        qcTesting: string;
        other: string;
      };
      stepStatus: {
        label: string;
        pending: string;
        inProgress: string;
        completed: string;
        failed: string;
      };
      rawMaterials: string;
      deviations: string;
      yield: string;
      remarks: string;
      masterBatchRecord: string;
    };

    supplier: {
      title: string;
      singular: string;
      newSupplier: string;
      supplierName: string;
      supplierNumber: string;
      contactPerson: string;
      contactEmail: string;
      contactPhone: string;
      address: string;
      country: string;
      category: {
        label: string;
        rawMaterial: string;
        packaging: string;
        equipment: string;
        service: string;
        contractManufacturer: string;
        laboratory: string;
        other: string;
      };
      qualificationMethod: {
        label: string;
        onSiteAudit: string;
        questionnaire: string;
        certificateReview: string;
        thirdPartyAssessment: string;
        historicalPerformance: string;
      };
      qualificationDate: string;
      nextReviewDate: string;
      rating: string;
      performance: string;
      criticalSuppliers: string;
      approvedMaterials: string;
      auditHistory: string;
      nonConformities: string;
      certificates: string;
    };

    oosOot: {
      title: string;
      singular: string;
      newOosOot: string;
      oosOotNumber: string;
      type: {
        label: string;
        oos: string;
        oot: string;
      };
      product: string;
      testParameter: string;
      specification: string;
      result: string;
      analyst: string;
      testDate: string;
      instrument: string;
      phase1: {
        title: string;
        laboratoryInvestigation: string;
        assignableCauseFound: string;
        noAssignableCauseFound: string;
        errorFound: string;
        noErrorFound: string;
        retest: string;
        conclusion: string;
        resample: string;
      };
      phase2: {
        title: string;
        fullScaleInvestigation: string;
        manufacturingInvestigation: string;
        confirmedOos: string;
        invalidated: string;
        impactAssessment: string;
        batchDisposition: string;
        conclusion: string;
      };
      linkedNcr: string;
      linkedCapa: string;
      closureDate: string;
    };

    forms: {
      title: string;
      newTemplate: string;
      newForm: string;
      template: {
        title: string;
        name: string;
        description: string;
        fields: string;
        workflow: string;
        compliance: string;
        status: string;
        version: string;
        regulatoryReference: string;
        retentionPeriod: string;
        dataClassification: string;
        auditTrailEnabled: string;
        printFriendlyLayout: string;
        cfrPart11Compliance: string;
      };
      instance: {
        title: string;
        template: string;
        status: string;
        submittedBy: string;
        submittedAt: string;
        approvals: string;
        approvalStep: string;
        approver: string;
        decision: string;
        comment: string;
        signature: string;
        lockAfterSubmission: string;
        workflowType: string;
        single: string;
        sequential: string;
        parallel: string;
      };
      fieldTypes: {
        label: string;
        text: string;
        number: string;
        date: string;
        select: string;
        checkbox: string;
        textarea: string;
        signature: string;
        table: string;
        rating: string;
        file: string;
        repeater: string;
      };
      fieldProperties: {
        label: string;
        name: string;
        required: string;
        options: string;
        helpText: string;
        defaultValue: string;
      };
    };

    compliance: {
      title: string;
      overallCompliance: string;
      compliant: string;
      partiallyCompliant: string;
      nonCompliant: string;
      notAssessed: string;
      gaps: string;
      standards: {
        label: string;
        iso13485: string;
        iso14971: string;
        iso9001: string;
        fda21cfr820: string;
        ichQ10: string;
        ichQ7: string;
        ichQ9: string;
        ivdr: string;
        euGmp: string;
      };
      scoring: {
        label: string;
        score: string;
        weight: string;
        gapCount: string;
        lastAssessment: string;
        trend: string;
      };
      checklist: string;
      clause: string;
      requirement: string;
      evidence: string;
      gapDescription: string;
      remediationPlan: string;
      gapOwner: string;
      targetDate: string;
    };

    reports: {
      title: string;
      generate: string;
      export: string;
      scheduled: {
        label: string;
        newSchedule: string;
        reportType: string;
        frequency: string;
        daily: string;
        weekly: string;
        monthly: string;
        quarterly: string;
        annually: string;
        recipients: string;
        lastRun: string;
        nextRun: string;
        enabled: string;
        disabled: string;
      };
      reportTypes: {
        capaReport: string;
        ncrReport: string;
        deviationReport: string;
        auditReport: string;
        trainingReport: string;
        riskReport: string;
        supplierReport: string;
        complianceReport: string;
        batchReport: string;
        overdueItems: string;
        customReport: string;
      };
      dateRange: string;
      format: string;
      columns: string;
      grouping: string;
      sorting: string;
    };

    userManagement: {
      title: string;
      users: string;
      newUser: string;
      roles: string;
      permissions: string;
      roleLabel: string;
      department: string;
      jobTitle: string;
      lastLogin: string;
      active: string;
      inactive: string;
      inviteUser: string;
      removeUser: string;
      admin: string;
      qualityManager: string;
      auditor: string;
      documentController: string;
      executive: string;
      operator: string;
    };

    settings: {
      title: string;
      tabs: {
        general: string;
        security: string;
        notifications: string;
        modules: string;
        branding: string;
        dataRetention: string;
      };
      general: {
        companyName: string;
        companySize: string;
        country: string;
        city: string;
        language: string;
        dateFormat: string;
        timezone: string;
        fiscalYear: string;
      };
      security: {
        passwordPolicy: string;
        sessionTimeout: string;
        twoFactorAuth: string;
        eSignaturePolicy: string;
        auditLogRetention: string;
        ipWhitelist: string;
      };
      notifications: {
        emailNotifications: string;
        inAppNotifications: string;
        capaOverdue: string;
        ncrOverdue: string;
        documentExpiry: string;
        trainingOverdue: string;
        auditDue: string;
        supplierReview: string;
        dailyDigest: string;
        weeklyDigest: string;
      };
      modules: {
        activeModules: string;
        availableModules: string;
        enable: string;
        disable: string;
        coreModules: string;
        optionalModules: string;
      };
      branding: {
        logo: string;
        primaryColor: string;
        loginBackground: string;
        customCss: string;
      };
      dataRetention: {
        retentionPeriod: string;
        archivalPolicy: string;
        purgeRules: string;
      };
    };

    setup: {
      title: string;
      subtitle: string;
      steps: {
        organization: string;
        industry: string;
        standards: string;
        modules: string;
        team: string;
        summary: string;
      };
      organization: {
        companyName: string;
        companySize: string;
        selectCountry: string;
        city: string;
      };
      industry: {
        title: string;
        subtitle: string;
        medicalDevice: string;
        pharmaceutical: string;
        biotech: string;
        ivd: string;
        combinationProduct: string;
      };
      standards: {
        title: string;
        subtitle: string;
        applicableStandards: string;
        primaryStandard: string;
        additionalStandards: string;
      };
      modules: {
        title: string;
        subtitle: string;
        coreModules: string;
        optionalModules: string;
        selected: string;
        optionalStep: string;
      };
      team: {
        title: string;
        subtitle: string;
        adminName: string;
        adminEmail: string;
        addTeamMember: string;
        teamMembers: string;
        role: string;
      };
      summary: {
        title: string;
        subtitle: string;
        reviewConfiguration: string;
        launchSystem: string;
        goBack: string;
      };
      previous: string;
      next: string;
      cancel: string;
      launch: string;
    };
  };

  // ─── Record Links ──────────────────────────────────────────────────────
  recordLinks: {
    related: string;
    caused_by: string;
    corrected_by: string;
    linked_to: string;
    derived_from: string;
    supersedes: string;
    references: string;
    depends_on: string;
    addLink: string;
    selectRecord: string;
    selectLinkType: string;
    linkDescription: string;
    linkedRecords: string;
  };

  // ─── Bulk Operations ───────────────────────────────────────────────────
  bulk: {
    title: string;
    selected: string;
    changeStatus: string;
    exportCsv: string;
    delete: string;
    assign: string;
    confirm: string;
    confirmMessage: string;
    noSelection: string;
    success: string;
    error: string;
  };

  // ─── Custom Fields ─────────────────────────────────────────────────────
  customFields: {
    title: string;
    addField: string;
    editField: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    required: string;
    options: string;
    helpText: string;
    defaultValue: string;
    deleteField: string;
    reorderFields: string;
  };

  // ─── Data Import ───────────────────────────────────────────────────────
  dataImport: {
    title: string;
    selectFile: string;
    dragDrop: string;
    supportedFormats: string;
    preview: string;
    columnMapping: string;
    import: string;
    success: string;
    errors: string;
    rowsProcessed: string;
    rowsImported: string;
    rowsSkipped: string;
    rowsFailed: string;
    downloadTemplate: string;
    startImport: string;
    validateData: string;
    importHistory: string;
  };

  // ─── Rate Limiting ─────────────────────────────────────────────────────
  rateLimit: {
    tooManyRequests: string;
    retryAfter: string;
    limitExceeded: string;
  };

  // ─── Validation Messages ───────────────────────────────────────────────
  validation: {
    required: string;
    invalidEmail: string;
    minLength: string;
    maxLength: string;
    pattern: string;
    unique: string;
    passwordStrength: string;
    invalidFormat: string;
    invalidDate: string;
    dateRange: string;
    invalidNumber: string;
    numberRange: string;
    invalidUrl: string;
    fileSize: string;
    fileType: string;
    atLeastOne: string;
  };

  // ─── Audit Trail ───────────────────────────────────────────────────────
  auditTrail: {
    title: string;
    action: {
      create: string;
      update: string;
      delete: string;
      approve: string;
      reject: string;
      sign: string;
      login: string;
      logout: string;
      export: string;
      view: string;
    };
    filters: {
      dateRange: string;
      user: string;
      action: string;
      entityType: string;
      recordId: string;
    };
    integrity: {
      title: string;
      hashVerified: string;
      hashMismatch: string;
      sequenceVerified: string;
      sequenceBroken: string;
      lastVerified: string;
      verifyNow: string;
    };
    details: {
      timestamp: string;
      user: string;
      action: string;
      entity: string;
      field: string;
      oldValue: string;
      newValue: string;
      ipAddress: string;
      userAgent: string;
      changes: string;
    };
  };

  // ─── Dashboard ─────────────────────────────────────────────────────────
  dashboard: {
    title: string;
    welcome: string;
    qualityDashboard: string;
    kpis: {
      openCapas: string;
      overdueItems: string;
      criticalItems: string;
      pendingApprovals: string;
      openNcrs: string;
      openDeviations: string;
      trainingOverdue: string;
      activeRisks: string;
      complianceScore: string;
      closureRate: string;
      avgRPN: string;
      avgPerformance: string;
    };
    recentActivity: string;
    trends: string;
    deadlines: string;
    quickActions: string;
    qualityMetricsTrend: string;
    capaStatus: string;
    riskProfile: string;
    deviationStatus: string;
    changeControlStatus: string;
    ncrByType: string;
    createCapa: string;
    createNcr: string;
    uploadDoc: string;
    scheduleAudit: string;
    approved: string;
    inReview: string;
    drafts: string;
    released: string;
    qualified: string;
    openChangeControls: string;
    pendingQA: string;
    inImplementation: string;
    requested: string;
  };

  // ─── E-Signature (21 CFR Part 11) ──────────────────────────────────────
  eSignature: {
    title: string;
    sign: string;
    verify: string;
    password: string;
    purpose: {
      label: string;
      approval: string;
      rejection: string;
      review: string;
      verification: string;
    };
    signerName: string;
    signerRole: string;
    timestamp: string;
    meaning: string;
    reason: string;
    confirmPassword: string;
    signatureApplied: string;
    signatureRevoked: string;
    revocationReason: string;
    part11Compliance: string;
    biometricEquivalent: string;
  };

  // ─── Errors ────────────────────────────────────────────────────────────
  errors: {
    unauthorized: string;
    forbidden: string;
    notFound: string;
    serverError: string;
    networkError: string;
    sessionExpired: string;
    validationError: string;
    duplicateEntry: string;
    fileTooLarge: string;
    invalidFileType: string;
    quotaExceeded: string;
    maintenanceMode: string;
    unknownError: string;
  };

  // ─── Pagination ────────────────────────────────────────────────────────
  pagination: {
    showing: string;
    of: string;
    previous: string;
    next: string;
    perPage: string;
    page: string;
    goToPage: string;
    total: string;
  };

  // ─── Date/Time ─────────────────────────────────────────────────────────
  dateTime: {
    today: string;
    yesterday: string;
    last7Days: string;
    last30Days: string;
    last90Days: string;
    thisMonth: string;
    lastMonth: string;
    thisQuarter: string;
    lastQuarter: string;
    thisYear: string;
    lastYear: string;
    customRange: string;
    format: string;
    from: string;
    to: string;
    startDate: string;
    endDate: string;
    time: string;
  };

  // ─── Search ────────────────────────────────────────────────────────────
  search: {
    placeholder: string;
    noResults: string;
    filters: string;
    clearFilters: string;
    advancedSearch: string;
    searchIn: string;
    sortBy: string;
    sortOrder: string;
    ascending: string;
    descending: string;
    recentSearches: string;
    saveSearch: string;
    savedSearches: string;
  };

  // ─── Auth ──────────────────────────────────────────────────────────────
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    signIn: string;
    signUp: string;
    demoMode: string;
    createOrg: string;
    existingOrg: string;
    welcome: string;
    subtitle: string;
    forgotPassword: string;
    resetPassword: string;
    confirmPassword: string;
    twoFactor: string;
    twoFactorCode: string;
    verifyCode: string;
  };
}

export type Locale = 'fr' | 'en';