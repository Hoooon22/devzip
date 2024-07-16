package com.hoooon22.devzip.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;

@Service
public class EntryService {

    private final EntryRepository entryRepository;

    @Autowired
    public EntryService(EntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    @Transactional(readOnly = true)
    public List<Entry> getAllEntries() {
        return entryRepository.findAll();
    }

    @Transactional
    public Entry addEntry(Entry entry) {
        return entryRepository.save(entry);
    }
}
