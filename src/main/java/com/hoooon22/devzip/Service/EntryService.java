package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Entity.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EntryService {

    private final EntryRepository entryRepository;

    public List<Entry> getAllEntries() {
        return entryRepository.findAll();
    }

    public Entry addEntry(Entry entry) {
        return entryRepository.save(entry);
    }
}
